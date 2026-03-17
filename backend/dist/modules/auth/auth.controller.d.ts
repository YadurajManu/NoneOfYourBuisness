import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(body: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            role: any;
            organization: any;
        };
    }>;
    register(body: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            role: any;
            organization: any;
        };
    }>;
}
