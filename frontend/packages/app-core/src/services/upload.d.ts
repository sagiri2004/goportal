export type UploadMediaType = 'avatar' | 'server_icon' | 'server_banner' | 'message_attachment' | 'role_icon';
export type UploadResult = {
    attachment_id?: string;
    media_type: UploadMediaType;
    url: string;
    file_name: string;
    file_type: string;
    file_size: number;
};
export declare const uploadMedia: (file: File, mediaType: UploadMediaType, options?: {
    onProgress?: (progress: number) => void;
}) => Promise<UploadResult>;
//# sourceMappingURL=upload.d.ts.map