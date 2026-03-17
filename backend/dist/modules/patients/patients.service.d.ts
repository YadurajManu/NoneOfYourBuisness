import { PrismaService } from '../database/prisma.service';
export declare class PatientsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(orgId: string): Promise<{
        id: string;
        organizationId: string;
        fhirResource: import("@prisma/client/runtime/library").JsonValue;
        lifecycleStage: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string, orgId: string): Promise<({
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
    create(orgId: string, fhirResource: any): Promise<{
        id: string;
        organizationId: string;
        fhirResource: import("@prisma/client/runtime/library").JsonValue;
        lifecycleStage: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateStage(id: string, orgId: string, stage: number): Promise<{
        id: string;
        organizationId: string;
        fhirResource: import("@prisma/client/runtime/library").JsonValue;
        lifecycleStage: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
