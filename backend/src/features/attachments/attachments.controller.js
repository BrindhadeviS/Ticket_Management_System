import * as attachmentsService from "./attachments.service.js";

const send = (asDownload) => async (req, res, next) => {
  try {
    const file = await attachmentsService.getAttachmentForUser(
      req.params.ticketId,
      req.user,
    );

    // Set a generic content type if we don't have one – forces download in most browsers
    const mime = file.mime_type || 'application/octet-stream';
    res.setHeader('Content-Type', mime);

    if (asDownload) {
      // Force download with proper disposition header
      return res.download(file.absolute, file.name);
    }
    // Inline view (e.g., PDF, image) with filename hint
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.name)}"`,
    );
    res.sendFile(file.absolute);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const view = send(false);
export const download = send(true);