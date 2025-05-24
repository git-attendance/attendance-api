import axios from 'axios';
import FormData from 'form-data';
import { AppError } from '../middleware/errorHandler';

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
                throw new AppError('No response data from face enrollment', 400);
            }

            if (!response.data.uuid) {
                throw new AppError('No person UUID returned from enrollment', 400);
            }

            if (response.data.status !== 'success') {
                throw new AppError('Face enrollment was not successful', 400);
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

            if (error.response) {
                const message = error.response.data.message || 'Face enrollment failed';
                throw new AppError(message, error.response.status);
            }
            throw new AppError('Face enrollment service error', 500);
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
                throw new AppError('No response data from face verification', 400);
            }

            if (!Array.isArray(response.data)) {
                throw new AppError('Invalid response format from face verification', 400);
            }

            if (response.data.length === 0) {
                throw new AppError('No face detected in the image', 400);
            }

            const match = response.data[0];
            if (!match.name) {
                throw new AppError('No person name in verification response', 400);
            }

            if (match.probability < 0.8) {
                throw new AppError(`Face verification confidence too low: ${match.probability}`, 400);
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

            if (error.response) {
                const message = error.response.data.message || 'Face verification failed';
                throw new AppError(message, error.response.status);
            }
            throw new AppError('Face verification service error', 500);
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
                throw new AppError(error.response.data.message || 'Failed to retrieve person details', error.response.status);
            }
            throw new AppError('Person retrieval service error', 500);
        }
    }
} 