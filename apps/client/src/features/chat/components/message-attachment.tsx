import { IconFile } from "@tabler/icons-react";
import { getFileUrl } from "@/lib/config";
import { formatBytes } from "@/lib/utils";
import { IMessageAttachment } from "../types/chat.types";
import classes from "./message-item.module.css";

interface MessageAttachmentProps {
  attachment: IMessageAttachment;
}

export function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const url = getFileUrl(`/files/${attachment.id}/${attachment.fileName}`);
  const isImage = attachment.mimeType?.startsWith("image/");

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
          alt={attachment.fileName}
          className={classes.attachmentImage}
        />
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className={classes.attachmentFile}>
      <IconFile size={18} />
      <span className={classes.attachmentFileName}>{attachment.fileName}</span>
      <span className={classes.attachmentFileSize}>
        {formatBytes(attachment.fileSize)}
      </span>
    </a>
  );
}
