export const CATEGORIES = {
  "Accounts & Access": {
    "Password & Login": ["Forgot password", "Account locked", "MFA not working"],
    "Access Requests": ["Shared folder access", "Application access"]
  },
  "Hardware & Devices": {
    "Laptop & Desktop": ["Not powering on", "Slow performance", "Battery issue"],
    "Peripherals": ["Keyboard / Mouse", "Monitor"]
  },
  "Network & Connectivity": {
    "Wi-Fi": ["Cannot connect", "Slow speed"],
    "VPN": ["Cannot connect", "Frequent disconnects"]
  },
  "Others": {
    "General Request": ["Other"]
  },
  "Printing & Scanning": {
    "Printers": ["Printer offline", "Paper jam", "Need printer added"],
    "Scanners": ["Scan to email failing"]
  },
  "Software & Applications": {
    "Communication & Meetings (Zoom, Webex, etc.)": ["Cannot join meeting", "Audio / video issue"],
    "Ladera Business Applications (ERP, HR, Finance)": ["Login issue", "Module access", "Error in application"],
    "Microsoft Office 365": ["Outlook issue", "Teams issue", "Licence / activation"],
    "Software Installation & Updates": ["Need New Software Installed", "Prompted for Admin Password to Update", "Software is Missing from PC"],
    "Web Browsers (Chrome, Edge)": ["Browser crashing", "Extension / add-on issue"]
  }
};

export const ROLES = ["Employee", "Approver", "Support Team", "Admin"];

export const ROLE_NAV = {
  Admin: [
    { key: "dash", label: "All Tickets Dashboard" },
    { key: "mine", label: "My Dashboard" },
    { key: "users", label: "Employees" },
    { key: "masterData", label: "Master Data" },
    { key: "new", label: "New Ticket" },
    { key: "notifs", label: "Notifications" }
  ],
  Employee: [
    { key: "dash", label: "Dashboard" },
    { key: "new", label: "New Ticket" },
    { key: "notifs", label: "Notifications" }
  ],
  Approver: [
    { key: "dash", label: "Dashboard" },
    { key: "mine", label: "My Dashboard" },
    { key: "new", label: "New Ticket" },
    { key: "notifs", label: "Notifications" }
  ],
  "Support Team": [
    { key: "dash", label: "All Tickets Dashboard" },
    { key: "mine", label: "My Dashboard" },
    { key: "pool", label: "Ticket Pool" },
    { key: "work", label: "My Assigned Work" },
    { key: "new", label: "New Ticket" },
    { key: "notifs", label: "Notifications" }
  ]
};

export const formatTimestamp = () => {
  return new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
};

export const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "U";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};


export const formatNotifTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatFileSize = (bytes) => {
  const n = Number(bytes);
  if (!n || n < 0) return "0 KB";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};