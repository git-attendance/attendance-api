import { StudentModel } from "../models/studentModel";

export interface FlattenedStudent {
  firstName: string;
  lastName: string;
  middleName?: string;
  studentId: string;
  gradeLevel: string;
  section: string;
  strand: string;
  email: string;
  dateOfBirth?: string;
  personId?: string;
  guardianFirstName: string;
  guardianLastName: string;
  guardianMiddleName?: string;
  guardianEmail: string;
  guardianPhoneNumber?: string;
  remarks?: string;
  color?: string;
  bgColor?: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}

export class CSVExportHelper {
  /**
   * Converts an array of students to CSV format
   * @param students - Array of student documents
   * @returns CSV string
   */
  static exportStudentsToCSV(students: StudentModel[]): string {
    if (students.length === 0) {
      return "";
    }

    // Define CSV headers
    const headers = [
      "First Name",
      "Last Name",
      "Middle Name",
      "Student ID",
      "Grade Level",
      "Section",
      "Strand",
      "Email",
      "Date of Birth",
      "Person ID",
      "Guardian First Name",
      "Guardian Last Name",
      "Guardian Middle Name",
      "Guardian Email",
      "Guardian Phone Number",
      "Remarks",
      "Color",
      "Background Color",
      "Image URL",
      "Created At",
      "Updated At",
    ];

    // Flatten student data
    const flattenedStudents = students.map((student) => this.flattenStudentData(student));

    // Convert to CSV
    const csvContent = this.convertToCSV(headers, flattenedStudents);

    return csvContent;
  }

  /**
   * Flattens student data for CSV export
   * @param student - Student document
   * @returns Flattened student data
   */
  private static flattenStudentData(student: StudentModel): FlattenedStudent {
    return {
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      middleName: student.middleName || "",
      studentId: student.studentId || "",
      gradeLevel: student.gradeLevel || "",
      section: student.section || "",
      strand: student.strand || "",
      email: student.email || "",
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split("T")[0] : "",
      personId: student.personId || "",
      guardianFirstName: student.guardian?.firstName || "",
      guardianLastName: student.guardian?.lastName || "",
      guardianMiddleName: student.guardian?.middleName || "",
      guardianEmail: student.guardian?.email || "",
      guardianPhoneNumber: student.guardian?.phoneNumber || "",
      remarks: student.remarks || "",
      color: student.color || "",
      bgColor: student.bgColor || "",
      image: student.image || "",
      createdAt: student.createdAt ? student.createdAt.toISOString() : "",
      updatedAt: student.updatedAt ? student.updatedAt.toISOString() : "",
    };
  }

  /**
   * Converts headers and data to CSV format
   * @param headers - Array of column headers
   * @param data - Array of flattened student data
   * @returns CSV string
   */
  private static convertToCSV(headers: string[], data: FlattenedStudent[]): string {
    // Escape and quote CSV values
    const escapeCSVValue = (value: string): string => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Create CSV header row
    const headerRow = headers.map((header) => escapeCSVValue(header)).join(",");

    // Create CSV data rows
    const dataRows = data.map((student) => {
      const values = [
        student.firstName,
        student.lastName,
        student.middleName || "",
        student.studentId,
        student.gradeLevel,
        student.section,
        student.strand,
        student.email,
        student.dateOfBirth || "",
        student.personId || "",
        student.guardianFirstName,
        student.guardianLastName,
        student.guardianMiddleName || "",
        student.guardianEmail,
        student.guardianPhoneNumber || "",
        student.remarks || "",
        student.color || "",
        student.bgColor || "",
        student.image,
        student.createdAt,
        student.updatedAt,
      ];

      return values.map((value) => escapeCSVValue(value.toString())).join(",");
    });

    // Combine header and data rows
    return [headerRow, ...dataRows].join("\n");
  }

  /**
   * Generates a filename for CSV export
   * @param prefix - Optional prefix for the filename
   * @returns Filename with timestamp
   */
  static generateCSVFilename(prefix: string = "students"): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    return `${prefix}_${timestamp}.csv`;
  }
}
