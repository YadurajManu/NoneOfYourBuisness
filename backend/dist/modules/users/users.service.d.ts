import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<({
        organization: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
        };
    } & {
        id: string;
        email: string;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    create(data: {
        email: string;
        passwordHash: string;
        role: UserRole;
        organizationId: string;
    }): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createWithOrganization(orgName: string, adminEmail: string, passwordHash: string): Promise<{
        users: {
            id: string;
            email: string;
            passwordHash: string;
            role: import(".prisma/client").$Enums.UserRole;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
}
