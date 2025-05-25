import axios from 'axios';
import FormData from 'form-data';

export class FaceRecognitionService {
    private readonly baseUrl = 'https://api.luxand.cloud';
    private readonly token: string;

    constructor() {
        this.token = 'f491b27fcab246a6a35632e1756b373c';
    }

    /**
     * Enrolls a person in the face recognition system
     * @param name - Name of the person
     * @param photoBuffer - Buffer of the photo file
     * @param store - Store identifier (default: "1")
     * @param collections - Optional collections to add the person to
     * @param filename - Original filename of the uploaded photo
     */
    async enrollPerson(
        name: string,
        photoBuffer: Buffer,
        store: string = "1",
        collections: string[] = [],
        filename: string = 'photo.jpg'
    ) {
        try {
            const form = new FormData();
            form.append('photos', photoBuffer, { filename });
            form.append('name', name);
            form.append('store', store);
            form.append('collections', collections.join(','));
            form.append('unique', '0');

            const headers = {
                'token': this.token,
                'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`
            };

            console.log('Sending enrollment request to Luxand API...', {
                name,
                store,
                collections,
                filename
            });

            const options = {
                method: 'POST',
                url: `${this.baseUrl}/v2/person`,
                headers: headers,
                data: form
            };

            const response = await axios(options);
            console.log('Luxand API enrollment response:', JSON.stringify(response.data));

            if (!response.data) {
                const error = new Error('No response data from face enrollment') as any;
                error.statusCode = 400;
                error.code = 'FACE_ENROLLMENT_NO_DATA';
                throw error;
            }

            if (!response.data.uuid) {
                const error = new Error('No person UUID returned from enrollment') as any;
                error.statusCode = 400;
                error.code = 'FACE_ENROLLMENT_NO_UUID';
                throw error;
            }

            if (response.data.status !== 'success') {
                const error = new Error('Face enrollment was not successful') as any;
                error.statusCode = 400;
                error.code = 'FACE_ENROLLMENT_FAILED';
                throw error;
            }

            return {
                id: response.data.uuid,
                name: response.data.name,
                store: store,
                faces: response.data.faces
            };
        } catch (error: any) {
            console.error('Face enrollment detailed error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            if (error.statusCode) throw error;

            if (error.response) {
                const err = new Error(error.response.data.message || 'Face enrollment failed') as any;
                err.statusCode = error.response.status;
                err.code = 'FACE_ENROLLMENT_API_ERROR';
                throw err;
            }

            const err = new Error('Face enrollment service error') as any;
            err.statusCode = 500;
            err.code = 'FACE_ENROLLMENT_SERVICE_ERROR';
            throw err;
        }
    }

    /**
     * Verifies a person's identity using their photo
     * @param photoBuffer - Buffer of the photo to verify
     * @param store - Store identifier (default: "1")
     * @param filename - Original filename of the uploaded photo
     */
    async verifyPerson(
        photoBuffer: Buffer,
        store: string = "1",
        filename: string = 'photo.jpg'
    ) {
        try {
            const form = new FormData();
            form.append('photo', photoBuffer, { filename });
            form.append('store', store);

            const headers = {
                'token': this.token,
                'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`
            };

            console.log('Sending verification request to Luxand API...');
            
            const options = {
                method: 'POST',
                url: `${this.baseUrl}/photo/search/v2`,
                headers: headers,
                data: form
            };

            const response = await axios(options);
            console.log('Luxand API response:', JSON.stringify(response.data));

            if (!response.data) {
                const error = new Error('No response data from face verification') as any;
                error.statusCode = 400;
                error.code = 'FACE_VERIFICATION_NO_DATA';
                throw error;
            }

            if (!Array.isArray(response.data)) {
                const error = new Error('Invalid response format from face verification') as any;
                error.statusCode = 400;
                error.code = 'FACE_VERIFICATION_INVALID_FORMAT';
                throw error;
            }

            if (response.data.length === 0) {
                const error = new Error('No face detected in the image') as any;
                error.statusCode = 400;
                error.code = 'FACE_VERIFICATION_NO_FACE';
                throw error;
            }

            const match = response.data[0];
            if (!match.name) {
                const error = new Error('No person name in verification response') as any;
                error.statusCode = 400;
                error.code = 'FACE_VERIFICATION_NO_NAME';
                throw error;
            }

            if (match.probability < 0.8) {
                const error = new Error(`Face verification confidence too low: ${match.probability}`) as any;
                error.statusCode = 400;
                error.code = 'FACE_VERIFICATION_LOW_CONFIDENCE';
                throw error;
            }

            return [{
                name: match.name,
                confidence: match.probability,
                uuid: match.uuid
            }];
        } catch (error: any) {
            console.error('Face verification detailed error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            if (error.statusCode) throw error;

            if (error.response) {
                const err = new Error(error.response.data.message || 'Face verification failed') as any;
                err.statusCode = error.response.status;
                err.code = 'FACE_VERIFICATION_API_ERROR';
                throw err;
            }

            const err = new Error('Face verification service error') as any;
            err.statusCode = 500;
            err.code = 'FACE_VERIFICATION_SERVICE_ERROR';
            throw err;
        }
    }

    /**
     * Retrieves a person's details from the system
     * @param personId - ID of the person to retrieve
     */
    async getPersonDetails(personId: string) {
        try {
            const form = new FormData();
            const headers = {
                'token': this.token,
                'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`
            };

            const options = {
                method: 'GET',
                url: `${this.baseUrl}/v2/person/${personId}`,
                headers: headers,
                data: form,
                params: { uuid: personId }
            };

            const response = await axios(options);
            return response.data;
        } catch (error: any) {
            if (error.response) {
                const err = new Error(error.response.data.message || 'Failed to retrieve person details') as any;
                err.statusCode = error.response.status;
                err.code = 'PERSON_DETAILS_API_ERROR';
                throw err;
            }

            const err = new Error('Person retrieval service error') as any;
            err.statusCode = 500;
            err.code = 'PERSON_DETAILS_SERVICE_ERROR';
            throw err;
        }
    }
} 