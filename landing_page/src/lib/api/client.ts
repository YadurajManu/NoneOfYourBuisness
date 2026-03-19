import type { AuthResponse, DemoLeadInput } from "./types";

const rawBase = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";
const API_BASE_URL = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

function resolveApiOriginFromBase(baseUrl: string) {
  if (!/^https?:\/\//i.test(baseUrl)) return "";
  const normalized = baseUrl.endsWith("/api") ? baseUrl.slice(0, -4) : baseUrl;
  return normalized.replace(/\/+$/, "");
}

let accessToken: string | null = null;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function parseMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null) {
    const maybeMessage = (data as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
    if (Array.isArray(maybeMessage)) return maybeMessage.join(", ");
  }
  return fallback;
}

async function parseJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

type RequestOptions = RequestInit & {
  auth?: boolean;
  retryOn401?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = false, retryOn401 = true, headers, ...rest } = options;
  const finalHeaders = new Headers(headers || {});

  if (!finalHeaders.has("Content-Type") && !(rest.body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (auth && accessToken) {
    finalHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: finalHeaders,
  });

  if (response.status === 401 && auth && retryOn401) {
    try {
      await refreshSession();
      return request<T>(path, { ...options, retryOn401: false });
    } catch {
      clearAccessToken();
      throw new ApiError("Unauthorized", 401, null);
    }
  }

  if (!response.ok) {
    const data = await parseJsonSafe(response);
    throw new ApiError(
      parseMessage(data, `Request failed (${response.status})`),
      response.status,
      data,
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await parseJsonSafe(response)) as T;
}

function parseContentDispositionFilename(headerValue: string | null) {
  if (!headerValue) return null;
  const match =
    /filename\*=UTF-8''([^;]+)/i.exec(headerValue) ||
    /filename=\"?([^\";]+)\"?/i.exec(headerValue);

  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

async function requestBlob(path: string, options: RequestOptions = {}) {
  const { auth = false, retryOn401 = true, headers, ...rest } = options;
  const finalHeaders = new Headers(headers || {});

  if (auth && accessToken) {
    finalHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: finalHeaders,
  });

  if (response.status === 401 && auth && retryOn401) {
    try {
      await refreshSession();
      return requestBlob(path, { ...options, retryOn401: false });
    } catch {
      clearAccessToken();
      throw new ApiError("Unauthorized", 401, null);
    }
  }

  if (!response.ok) {
    const data = await parseJsonSafe(response);
    throw new ApiError(
      parseMessage(data, `Request failed (${response.status})`),
      response.status,
      data,
    );
  }

  return {
    blob: await response.blob(),
    fileName:
      parseContentDispositionFilename(response.headers.get("content-disposition")) ||
      "report",
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

export function getAccessToken() {
  return accessToken;
}

export function resolveApiAssetUrl(pathOrUrl: string | null | undefined) {
  if (!pathOrUrl) return "";

  if (/^(https?:)?\/\//i.test(pathOrUrl) || pathOrUrl.startsWith("data:") || pathOrUrl.startsWith("blob:")) {
    return pathOrUrl;
  }

  if (!pathOrUrl.startsWith("/")) {
    return pathOrUrl;
  }

  const apiOrigin = resolveApiOriginFromBase(API_BASE_URL);
  if (!apiOrigin) return pathOrUrl;
  return `${apiOrigin}${pathOrUrl}`;
}

export async function login(email: string, password: string) {
  const data = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(data.access_token);
  return data;
}

export async function register(orgName: string, email: string, password: string) {
  const data = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ orgName, email, password }),
  });
  setAccessToken(data.access_token);
  return data;
}

export async function refreshSession() {
  const data = await request<AuthResponse>("/auth/refresh", {
    method: "POST",
    retryOn401: false,
  });
  setAccessToken(data.access_token);
  return data;
}

export async function logout() {
  await request<{ success: boolean }>("/auth/logout", {
    method: "POST",
    auth: true,
    retryOn401: false,
  });
  clearAccessToken();
}

export function getMe() {
  return request<AuthResponse["user"]>("/auth/me", { auth: true });
}

export function createDemoLead(input: DemoLeadInput) {
  return request<{ id: string; status: string; createdAt: string }>("/public/leads", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getDashboardOverview() {
  return request<Record<string, unknown>>("/dashboard/overview", { auth: true });
}

export function getMyCaseload() {
  return request<Array<Record<string, unknown>>>("/dashboard/my-caseload", {
    auth: true,
  });
}

export function getPatientTimeline(patientId: string) {
  return request<Record<string, unknown>>(`/dashboard/patient/${patientId}/timeline`, {
    auth: true,
  });
}

export function listPatients() {
  return request<Array<Record<string, unknown>>>("/patients", { auth: true });
}

export function createPatientRecord(payload: Record<string, unknown>) {
  return request<Record<string, unknown>>("/patients", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function updatePatientProfile(
  patientId: string,
  payload: {
    firstName?: string;
    lastName?: string;
    gender?: "male" | "female" | "other" | "unknown";
    birthDate?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    medicalRecordNumber?: string;
  },
) {
  return request<Record<string, unknown>>(`/patients/${patientId}/profile`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function assignPatientCareTeam(
  patientId: string,
  payload: {
    primaryDoctorUserId?: string | null;
    preferredSpecialistUserId?: string | null;
    createInitialTask?: boolean;
    createReferral?: boolean;
    referralPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    referralReason?: string;
  },
) {
  return request<Record<string, unknown>>(`/patients/${patientId}/care-team`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function updatePatientLifecycleStage(
  patientId: string,
  payload: {
    stage: number;
    reason?: string;
    metadata?: Record<string, unknown>;
    skipAutomations?: boolean;
  },
) {
  return request<Record<string, unknown>>(`/patients/${patientId}/stage`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function getPatientWorkflowSummary(patientId: string) {
  return request<Record<string, unknown>>(
    `/clinical-workflows/patient/${patientId}/summary`,
    { auth: true },
  );
}

export function createClinicalEvent(
  patientId: string,
  payload: {
    type: "LAB" | "VITAL" | "MEDICATION" | "ORDER" | "FOLLOW_UP";
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    description?: string;
    occurredAt?: string;
    raiseAlert?: boolean;
    alertPriority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    alertTitle?: string;
    alertMessage?: string;
    notifyFamily?: boolean;
  },
) {
  return request<Record<string, unknown>>(`/clinical-events/patient/${patientId}`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function createClinicalOrder(
  patientId: string,
  payload: {
    type:
      | "LAB_TEST"
      | "IMAGING"
      | "PROCEDURE"
      | "MEDICATION"
      | "CONSULTATION"
      | "FOLLOW_UP";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "STAT";
    title: string;
    description?: string;
    dueAt?: string;
    assignedToUserId?: string;
    notifyFamily?: boolean;
  },
) {
  return request<Record<string, unknown>>(
    `/clinical-workflows/patient/${patientId}/orders`,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
    },
  );
}

export function createReferralHandoff(
  patientId: string,
  payload: {
    clinicalOrderId?: string;
    assignedToUserId?: string;
    destinationType: "INTERNAL_PROVIDER" | "EXTERNAL_PROVIDER" | "FACILITY";
    destinationName: string;
    reason?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status?: "CREATED" | "ACCEPTED" | "IN_PROGRESS" | "ESCALATED" | "COMPLETED" | "DECLINED" | "CANCELLED";
    dueAt?: string;
    metadata?: Record<string, unknown>;
    notifyFamily?: boolean;
  },
) {
  return request<Record<string, unknown>>(
    `/clinical-workflows/patient/${patientId}/referrals`,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
    },
  );
}

export function uploadPatientDocumentForCareTeam(patientId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  return request<Record<string, unknown>>(`/documents/upload/${patientId}`, {
    method: "POST",
    auth: true,
    body: form,
  });
}

export function downloadCareTeamDocument(documentId: string) {
  return requestBlob(`/documents/${documentId}/download`, {
    auth: true,
  });
}

export function listOpenClinicalAlerts() {
  return request<Array<Record<string, unknown>>>("/clinical-events/alerts/open", {
    auth: true,
  });
}

export function listPatientAlerts(patientId: string) {
  return request<Array<Record<string, unknown>>>(`/clinical-events/alerts/patient/${patientId}`, {
    auth: true,
  });
}

export function listPatientOrders(patientId: string) {
  return request<Array<Record<string, unknown>>>(`/clinical-workflows/patient/${patientId}/orders`, {
    auth: true,
  });
}

export function updateClinicalOrderStatus(
  orderId: string,
  payload: {
    status: "DRAFT" | "ACTIVE" | "IN_PROGRESS" | "ESCALATED" | "COMPLETED" | "CANCELLED";
    note?: string;
    notifyFamily?: boolean;
  },
) {
  return request<Record<string, unknown>>(`/clinical-workflows/orders/${orderId}/status`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function listPatientReferrals(patientId: string) {
  return request<Array<Record<string, unknown>>>(`/clinical-workflows/patient/${patientId}/referrals`, {
    auth: true,
  });
}

export function listClaimableReferralPool() {
  return request<Array<Record<string, unknown>>>("/clinical-workflows/referrals/pool", {
    auth: true,
  });
}

export function claimReferralFromPool(referralId: string, note?: string) {
  return request<Record<string, unknown>>(`/clinical-workflows/referrals/${referralId}/claim`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ note }),
  });
}

export function updateReferralStatus(
  referralId: string,
  payload: {
    status:
      | "CREATED"
      | "ACCEPTED"
      | "IN_PROGRESS"
      | "ESCALATED"
      | "COMPLETED"
      | "DECLINED"
      | "CANCELLED";
    note?: string;
    notifyFamily?: boolean;
  },
) {
  return request<Record<string, unknown>>(`/clinical-workflows/referrals/${referralId}/status`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function listAdminUsers() {
  return request<Array<Record<string, unknown>>>("/admin/users", { auth: true });
}

export function createAdminUser(payload: {
  email: string;
  password: string;
  role: "ADMIN" | "DOCTOR" | "SPECIALIST" | "PATIENT" | "FAMILY_MEMBER";
  patientProfileId?: string;
  patientName?: string;
  displayName?: string;
}) {
  return request<Record<string, unknown>>("/admin/users", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function updateAdminUserRole(
  userId: string,
  role: "ADMIN" | "DOCTOR" | "SPECIALIST" | "PATIENT" | "FAMILY_MEMBER",
) {
  return request<Record<string, unknown>>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ role }),
  });
}

export function setAdminUserSuspension(userId: string, suspended: boolean) {
  return request<Record<string, unknown>>(`/admin/users/${userId}/suspend`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ suspended }),
  });
}

export function listActiveSpecialists() {
  return request<Array<Record<string, unknown>>>("/users/specialists", { auth: true });
}

export function listActiveDoctors() {
  return request<Array<Record<string, unknown>>>("/users/doctors", { auth: true });
}

export function getMyUserProfile() {
  return request<Record<string, unknown>>("/users/me/profile", { auth: true });
}

export function updateMyUserProfile(payload: { displayName?: string }) {
  return request<Record<string, unknown>>("/users/me/profile", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function uploadMyUserAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);

  return request<Record<string, unknown>>("/users/me/avatar", {
    method: "POST",
    auth: true,
    body: form,
  });
}

export function getMyVirtualCard() {
  return request<Record<string, unknown>>("/users/me/virtual-card", {
    auth: true,
  });
}

export function listAdminLeads() {
  return request<Array<Record<string, unknown>>>("/admin/leads", { auth: true });
}

export function updateLeadStatus(id: string, status: string) {
  return request<Record<string, unknown>>(`/admin/leads/${id}/status`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ status }),
  });
}

export function getPatientPortalMe() {
  return request<Record<string, unknown>>("/patient/me", { auth: true });
}

export function getPatientPortalTimeline() {
  return request<Record<string, unknown>>("/patient/timeline", { auth: true });
}

export function getPatientPortalDocuments() {
  return request<Array<Record<string, unknown>>>("/patient/documents", { auth: true });
}

export function uploadPatientPortalDocument(file: File) {
  const form = new FormData();
  form.append("file", file);

  return request<Record<string, unknown>>("/patient/documents/upload", {
    method: "POST",
    auth: true,
    body: form,
  });
}

export function downloadPatientPortalDocument(documentId: string) {
  return requestBlob(`/patient/documents/${documentId}/download`, {
    auth: true,
  });
}

export function listPatientFamilyAccess() {
  return request<Array<Record<string, unknown>>>("/patient/family-access", {
    auth: true,
  });
}

export function grantPatientFamilyAccess(payload: {
  familyUserId?: string;
  familyEmail?: string;
  accessLevel: "VIEW_ONLY" | "FULL_UPDATES" | "EMERGENCY_CONTACT";
  consentNote?: string;
  expiresAt?: string;
}) {
  return request<Record<string, unknown>>("/patient/family-access/grant", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function revokePatientFamilyAccess(accessId: string, note?: string) {
  return request<Record<string, unknown>>(`/patient/family-access/${accessId}/revoke`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ note }),
  });
}

export function listPatientFamilyInvites() {
  return request<Array<Record<string, unknown>>>("/patient/family-access/invites", {
    auth: true,
  });
}

export function respondPatientFamilyInvite(
  inviteId: string,
  payload: { decision: "APPROVE" | "REJECT"; note?: string },
) {
  return request<Record<string, unknown>>(`/patient/family-access/invites/${inviteId}/respond`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function listPatientFamilyAccessAudit() {
  return request<Array<Record<string, unknown>>>("/patient/family-access/audit", {
    auth: true,
  });
}

export function createFamilyAccessInvite(
  patientId: string,
  payload: {
    familyUserId?: string;
    familyEmail?: string;
    accessLevel: "VIEW_ONLY" | "FULL_UPDATES" | "EMERGENCY_CONTACT";
    consentNote?: string;
    expiresAt?: string;
  },
) {
  return request<Record<string, unknown>>(`/family-access/invite/${patientId}`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function listFamilyAccessInvitesForPatient(patientId: string) {
  return request<Array<Record<string, unknown>>>(`/family-access/patient/${patientId}/invites`, {
    auth: true,
  });
}

export function listFamilyAccessGrantsForPatient(patientId: string) {
  return request<Array<Record<string, unknown>>>(`/family-access/patient/${patientId}/grants`, {
    auth: true,
  });
}

export function listFamilyAccessAuditForPatient(patientId: string) {
  return request<Array<Record<string, unknown>>>(`/family-access/patient/${patientId}/audit`, {
    auth: true,
  });
}

export function revokeFamilyAccessGrant(accessId: string, note?: string) {
  return request<Record<string, unknown>>(`/family-access/revoke/${accessId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ note }),
  });
}

export function listFamilyPatients() {
  return request<Array<Record<string, unknown>>>("/family-access/my-patients", {
    auth: true,
  });
}

export function listFamilyNotifications() {
  return request<Array<Record<string, unknown>>>("/family-access/notifications", {
    auth: true,
  });
}

export function markFamilyNotificationRead(notificationId: string) {
  return request<{ updated: boolean }>(`/family-access/notifications/${notificationId}/read`, {
    method: "PATCH",
    auth: true,
  });
}

export function getFamilyNotificationPreferences() {
  return request<Record<string, unknown>>("/family-access/notification-preferences", {
    auth: true,
  });
}

export function updateFamilyNotificationPreferences(payload: {
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  emailAddress?: string;
  phoneNumber?: string;
  pushEnabled?: boolean;
  webhookEnabled?: boolean;
  pushToken?: string;
  webhookUrl?: string;
}) {
  return request<Record<string, unknown>>("/family-access/notification-preferences", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function getFamilyPatientView(patientId: string) {
  return request<Record<string, unknown>>(`/family-access/patient/${patientId}`, {
    auth: true,
  });
}

export function uploadFamilyPatientDocument(patientId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  return request<Record<string, unknown>>(`/family-access/patient/${patientId}/documents/upload`, {
    method: "POST",
    auth: true,
    body: form,
  });
}

export function downloadFamilyPatientDocument(patientId: string, documentId: string) {
  return requestBlob(`/family-access/patient/${patientId}/documents/${documentId}/download`, {
    auth: true,
  });
}

export function listFamilyQuestions() {
  return request<Array<Record<string, unknown>>>("/family-access/questions/my", {
    auth: true,
  });
}

export function askFamilyQuestion(patientId: string, question: string, context?: string) {
  return request<Record<string, unknown>>(`/family-access/questions/${patientId}`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ question, context }),
  });
}
