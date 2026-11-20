// Who may see a ticket. Same rules as the ticket lists:
// Admin and Approver see all, an Employee sees their own,
// Support Team sees tickets in the pool and tickets assigned to them.
export const canViewTicket = (user, ticket) => {
  const me = Number(user.employeeId);

  if (user.role === "Admin" || user.role === "Approver") return true;
  if (Number(ticket.created_by) === me) return true;
  if (user.role === "Support Team") {
    return (
      Number(ticket.assignee_id) === me ||
      (ticket.status === "Open" && !ticket.assignee_id)
    );
  }
  return false;
};