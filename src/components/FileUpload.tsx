"use client";
import { uploadToS3 } from "@/lib/s3";
import { useMutation } from "@tanstack/react-query";
import { Inbox, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import toast from "react-hot-toast";

const FileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { mutate, isLoading } = useMutation({
    mutationFn: async ({
      fileKey,
      fileName,
    }: {
      fileKey: string;
      fileName: string;
    }) => {
      const response = await axios.post("/api/create-chat", {
        fileKey,
        fileName,
      });
      return response.data;
    },
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];

      // check if file is bigger than 10MB
      if (file.size > 10 * 1024 * 1024) {
        // bigger than 10MB
        toast.error("Please upload a file smaller than 10MB");
        return;
      }

      try {
        setUploading(true);
        const data = await uploadToS3(file);
        if (!data?.fileKey || !data.fileName) {
          toast.error("Something went wrong");
          return;
        }
        mutate(data, {
          onSuccess: (data) => {
            toast.success(data.message);
            console.log(data);
          },
          onError: (err) => {
            toast.error("Error creating chat");
          },
        });
        console.log("data: ", data);
      } catch (error) {
        console.log(error);
      } finally {
        setUploading(false);
      }
    },
  });

  return (
    <div className="p-2 bg-white rounded-xl">
      <div
        {...getRootProps({
          className:
            "border-dashed border-2 rounded-xl cursor-pointer bg-gray-50 py-8 flex justify-center items-center flex-col",
        })}
      >
        <input {...getInputProps()} />
        {uploading || isLoading ? (
          <>
            {/* loading state */}
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            <p className="mt-2 text-sm text-slate-400">
              Spilling Tea to GPT...
            </p>
          </>
        ) : (
          <>
            <Inbox className="w-10 h-10 text-blue-500" />
            <p className="mt-2 text-sm text-slate-400">Drop PDF Here</p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
