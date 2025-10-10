"use client";

import { UploadDropzone } from "@/lib/uploadthing";
import { ourFileRouter } from "@/lib/uploadthing/core";
import toast from "react-hot-toast";

interface FileUploadProps {
    onChange: (res?: { url: string; name: string }) => void;
    endpoint: keyof typeof ourFileRouter;
}

export const FileUpload = ({
    onChange,
    endpoint,
}: FileUploadProps) => {
    return (
        <UploadDropzone
            endpoint={endpoint}
            onClientUploadComplete={(res) => {
                if (res && res[0]) {
                    onChange({
                        url: res[0].url || res[0].ufsUrl,
                        name: res[0].name
                    });
                }
            }}
            onUploadError={(error: Error) => {
                toast.error(`${error?.message}`);
            }}
        />
    )
}