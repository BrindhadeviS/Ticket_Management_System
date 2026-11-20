import * as workflowService from "./workflow.service.js";

// Runs a service call and turns its errors into proper HTTP responses.
const handle = (action) => async (req, res, next) => {
  try {
    const data = await action(req);
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const approve = handle((req) => workflowService.approveTicket(req.params.id, req.user));
export const reject = handle((req) => workflowService.rejectTicket(req.params.id, req.user, req.body.reason));
export const take = handle((req) => workflowService.takeTicket(req.params.id, req.user));
export const release = handle((req) => workflowService.releaseTicket(req.params.id, req.user));
export const resolve = handle((req) => workflowService.resolveTicket(req.params.id, req.user, req.body.resolution));
export const requestClarification = handle((req) => workflowService.requestClarification(req.params.id, req.user, req.body.text || req.body.question));
export const respondClarification = handle((req) => workflowService.respondClarification(req.params.id, req.user, req.body.text || req.body.reply || req.body.response));
export const clarify = handle((req) => {
  if (req.body.type === "reply" || req.body.response || req.body.reply) {
    return workflowService.respondClarification(req.params.id, req.user, req.body.text || req.body.response || req.body.reply);
  }
  return workflowService.requestClarification(req.params.id, req.user, req.body.text || req.body.question);
});