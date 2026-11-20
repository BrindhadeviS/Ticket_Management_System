export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
export const ASSET_BASE = API_BASE.replace(/\/api$/, "");

export async function loginToBackend(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message || "Login failed.");
  }
  return result;
}

export async function fetchTicketById(id) {
  const token = localStorage.getItem("tms_token");
  const res = await fetch(`${API_BASE}/tickets/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error ${res.status}`);
  }

  const result = await res.json();
  return result.data;
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------- Employees ----------------


export async function fetchEmployeesFromBackend() {
  try {
    const token = localStorage.getItem("tms_token");

    const res = await fetch(`${API_BASE}/employees`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const data = await res.json();
    return data.data || data;
  } catch (err) {
    console.warn(
      "Backend API not reachable or error fetching employees:",
      err.message
    );
    return null;
  }
}


export async function createEmployeeInBackend(employee) {
  const token = localStorage.getItem("tms_token");

  const res = await fetch(`${API_BASE}/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(employee),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Employee creation failed.");
  }

  return data;
}


export async function updateEmployeeInBackend(id, employeeData) {
  const token = localStorage.getItem("tms_token");

  const res = await fetch(`${API_BASE}/employees/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(employeeData),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Employee update failed.");
  }

  return data;
}

export async function setEmployeeActiveInBackend(id, active) {
  const token = localStorage.getItem("tms_token");

  try {
    const res = await fetch(`${API_BASE}/employees/${id}/active`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active: Boolean(active) }),
    });

    const data = await res.json();
    if (res.ok) return data;
    throw new Error(data.message || "Failed to update employee status");
  } catch (err) {
    console.warn("PATCH /active failed, trying PUT:", err);
  }

  return updateEmployeeInBackend(id, { active: Boolean(active) });
}


export async function deleteEmployeeInBackend(id) {
  const token = localStorage.getItem("tms_token");

  const res = await fetch(`${API_BASE}/employees/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Employee deletion failed.");
  }

  return data;
}

// ---------------- Tickets ----------------


export async function fetchTicketsFromBackend(params = {}) {
  try {
    const token = localStorage.getItem("tms_token");
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    const url = query ? `${API_BASE}/tickets?${query}` : `${API_BASE}/tickets`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const data = await res.json();
    if (data.pagination) {
      return { data: data.data, pagination: data.pagination };
    }
    return data.data || data;
  } catch (err) {
    console.warn(
      "Backend API not reachable or error fetching tickets:",
      err.message
    );
    return null;
  }
}

export async function fetchTicketPoolFromBackend() {
  try {
    const token = localStorage.getItem("tms_token");

    const res = await fetch(`${API_BASE}/tickets/pool`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const data = await res.json();
    return data.data || data;
  } catch (err) {
    console.warn("Error fetching ticket pool:", err.message);
    return null;
  }
}

export async function fetchAssignedTicketsFromBackend() {
  try {
    const token = localStorage.getItem("tms_token");

    const res = await fetch(`${API_BASE}/tickets/assigned`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);

    const data = await res.json();
    return data.data || data;
  } catch (err) {
    console.warn("Error fetching assigned tickets:", err.message);
    return null;
  }
}


export async function createTicketInBackend(ticket, file = null) {
  const token = localStorage.getItem("tms_token");

  const formData = new FormData();
  formData.append("ticket", JSON.stringify(ticket));

  if (file) {
    formData.append("attachment", file);
  }

  const res = await fetch(`${API_BASE}/tickets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Failed to create ticket (${res.status})`);
  }

  return data.data || data;
}

export async function updateTicketInBackend(id, updates, file = null, removeAttachment = false) {
  try {
    const token = localStorage.getItem("tms_token");

    let res;
    if (file || removeAttachment) {
      const formData = new FormData();
      formData.append("title", updates.title || "");
      formData.append("description", updates.desc || updates.description || "");
      if (updates.priority) formData.append("priority", updates.priority);
      if (removeAttachment) formData.append("removeAttachment", "true");
      if (file) formData.append("attachment", file);
      formData.append("ticket", JSON.stringify(updates));

      res = await fetch(`${API_BASE}/tickets/${id}/details`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      // If PATCH /details failed (e.g. status isn't pending approval), fallback to PUT /tickets/:id
      if (!res.ok && res.status !== 400 && res.status !== 403) {
        res = await fetch(`${API_BASE}/tickets/${id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      }
    } else {
      res = await fetch(`${API_BASE}/tickets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP error ${res.status}`);
    }

    const data = await res.json();
    return data.data || data;
  } catch (err) {
    console.warn("Backend API error updating ticket:", err.message);
    throw err;
  }
}


export async function resetEmployeePasswordInBackend(id, temporaryPassword) {
  const token = localStorage.getItem("tms_token");

  const res = await fetch(`${API_BASE}/auth/reset-password/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ temporaryPassword }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Password reset failed");
  }

  return data;
}

export async function deleteTicketInBackend(id) {
  const token = localStorage.getItem("tms_token");

  const res = await fetch(`${API_BASE}/tickets/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || `Failed to delete ticket (${res.status})`);
  }

  return data;
}

// ---------------- Real Email Dispatch ----------------

export async function sendEmailViaBackend({ to, subject, text, html }) {
  try {
    const token = localStorage.getItem("tms_token");
    const res = await fetch(`${API_BASE}/emails/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, subject, text, html })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend email dispatch error:", err.message);
    return null;
  }
}


export async function changePasswordInBackend(newPassword) {
  const token = localStorage.getItem("tms_token");

  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ newPassword }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Password update failed");
  }

  return data;
}

// ---------------- Dashboard ----------------

export async function fetchDashboardSummary() {
  try {
    const token = localStorage.getItem("tms_token");
    const res = await fetch(`${API_BASE}/dashboard/summary`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.data || data;
  } catch (err) {
    console.warn("Error fetching dashboard summary from backend:", err.message);
    return null;
  }
}

// ---------------- Workflow Actions ----------------

async function postWorkflow(endpoint, body = {}) {
  const token = localStorage.getItem("tms_token");
  const res = await fetch(`${API_BASE}/workflow/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Workflow error (${res.status})`);
  }
  return data.data || data;
}

export async function approveTicketInBackend(id) {
  return postWorkflow(`${id}/approve`);
}

export async function rejectTicketInBackend(id, reason) {
  return postWorkflow(`${id}/reject`, { reason });
}

export async function requestClarificationInBackend(id, text) {
  return postWorkflow(`${id}/clarify-request`, { text });
}

export async function respondClarificationInBackend(id, text) {
  return postWorkflow(`${id}/clarify-respond`, { text });
}

export async function takeTicketInBackend(id) {
  return postWorkflow(`${id}/take`);
}

export async function releaseTicketInBackend(id) {
  return postWorkflow(`${id}/release`);
}

export async function resolveTicketInBackend(id, resolution) {
  return postWorkflow(`${id}/resolve`, { resolution });
}

// ---------------- Notifications ----------------

export async function fetchNotificationsFromBackend() {
  try {
    const token = localStorage.getItem("tms_token");
    if (!token) return [];
    const res = await fetch(`${API_BASE}/notifications`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn("Error fetching notifications from backend:", err.message);
    return null;
  }
}

export async function markNotificationAsReadInBackend(id) {
  try {
    const token = localStorage.getItem("tms_token");
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function markAllNotificationsAsReadInBackend() {
  try {
    const token = localStorage.getItem("tms_token");
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function downloadAttachment(url, fileName) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = blobUrl;
    link.download = fileName || "attachment";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 150);
  } catch (error) {
    console.error("Direct download failed:", error);
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = url;
    link.setAttribute("download", fileName || "attachment");
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 150);
  }
}


