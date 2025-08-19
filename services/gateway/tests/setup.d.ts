export declare const createMockRequest: (overrides?: {}) => {
    method: string;
    url: string;
    headers: {
        "content-type": string;
        authorization: string;
    };
    body: {};
    query: {};
    params: {};
};
export declare const createMockResponse: () => any;
export declare const createMockNext: () => jest.Mock<any, any, any>;
export declare const createMockServiceResponse: (data: any, success?: boolean) => {
    success: boolean;
    data: any;
    error: any;
    status: number;
};
//# sourceMappingURL=setup.d.ts.map