import { PatientsService } from './patients.service';
export declare class PatientsController {
    private patientsService;
    constructor(patientsService: PatientsService);
    findAll(req: any): Promise<{
        id: string;
        organizationId: string;
        fhirResource: import("@prisma/client/runtime/library").JsonValue;
        lifecycleStage: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string, req: any): Promise<({
        documents: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            patientId: string;
            filePath: string;
            type: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            status: import(".prisma/client").$Enums.DocStatus;
        }[];
    } & {
        id: string;
        organizationId: string;
        fhirResource: import("@prisma/client/runtime/library").JsonValue;
        lifecycleStage: number;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    create(fhirResource: any, req: any): Promise<{
        id: string;
        organizationId: string;
        fhirResource: import("@prisma/client/runtime/library").JsonValue;
        lifecycleStage: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateStage(id: string, stage: number, req: any): Promise<{
        id: string;
        organizationId: string;
        fhirResource: import("@prisma/client/runtime/library").JsonValue;
        lifecycleStage: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
