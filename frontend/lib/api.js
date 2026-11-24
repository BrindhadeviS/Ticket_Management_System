export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
export const ASSET_BASE = API_BASE.replace(/\/api$/, "");

export async function loginToBackend(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    credentials: "include",
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

export async function fetchMeFromBackend() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error ${res.status}`);
  }

  const result = await res.json();
  return result.data;
}

export async function logoutFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchTicketById(id) {
  const res = await fetch(`${API_BASE}/tickets/${id}`, {
    method: "GET",
    credentials: "include",
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
    const res = await fetch(`${API_BASE}/health`, {
      method: "GET",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------- Employees ----------------

export async function fetchEmployeesFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/employees`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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
  const res = await fetch(`${API_BASE}/employees`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
  const res = await fetch(`${API_BASE}/employees/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
  try {
    const res = await fetch(`${API_BASE}/employees/${id}/active`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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
  const res = await fetch(`${API_BASE}/employees/${id}`, {
    method: "DELETE",
    credentials: "include",
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
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    );
    const query = new URLSearchParams(cleanParams).toString();
    const url = query ? `${API_BASE}/tickets?${query}` : `${API_BASE}/tickets`;

    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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
    const res = await fetch(`${API_BASE}/tickets/pool`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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
    const res = await fetch(`${API_BASE}/tickets/assigned`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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
  const formData = new FormData();
  formData.append("ticket", JSON.stringify(ticket));

  if (file) {
    formData.append("attachment", file);
  }

  const res = await fetch(`${API_BASE}/tickets`, {
    method: "POST",
    credentials: "include",
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
        credentials: "include",
        body: formData,
      });

      // If PATCH /details failed (e.g. status isn't pending approval), fallback to PUT /tickets/:id
      if (!res.ok && res.status !== 400 && res.status !== 403) {
        res = await fetch(`${API_BASE}/tickets/${id}`, {
          method: "PUT",
          credentials: "include",
          body: formData,
        });
      }
    } else {
      res = await fetch(`${API_BASE}/tickets/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
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
  const res = await fetch(`${API_BASE}/auth/reset-password/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
  const res = await fetch(`${API_BASE}/tickets/${id}`, {
    method: "DELETE",
    credentials: "include",
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
    const res = await fetch(`${API_BASE}/emails/send`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
    const res = await fetch(`${API_BASE}/dashboard/summary`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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
  const res = await fetch(`${API_BASE}/workflow/${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Workflow error (${res.status})`);
  }
  return data.data || data;
}

export async function approveTicketInBackend(id, reason = "") {
  return postWorkflow(`${id}/approve`, { reason });
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
    const res = await fetch(`${API_BASE}/notifications`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.warn("Error fetching notifications from backend:", err.message);
    return [];
  }
}

export async function markNotificationAsReadInBackend(id) {
  try {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function markAllNotificationsAsReadInBackend() {
  try {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function downloadAttachment(url, fileName) {
  try {
    const res = await fetch(url, { credentials: "include" });
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

export async function fetchCategoriesFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/categories`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch (err) {
    console.error("Failed to fetch categories:", err);
    return [];
  }
}

export async function fetchDepartmentsFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/departments`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch (err) {
    console.error("Failed to fetch departments:", err);
    return [];
  }
}
