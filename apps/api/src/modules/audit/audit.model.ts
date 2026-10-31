export type AuditActorType = "admin" | "jury" | "participant" | "system";

export type AuditCategory =
    | "application"
    | "jury_evaluation"
    | "jury_profile"
    | "user"
    | "settings"
    | "email_notification"
    | "auth"
    | "other";

export type RecordAuditEntryInput = {
    actorEmail?: string | null;
    actorId?: number | null;
    actorName?: string | null;
    actorRole?: string | null;
    actorType: AuditActorType;
    applicantFullName?: string | null;
    applicantPhone?: string | null;
    applicationId?: number | null;
    applicationNumber?: string | null;
    category: AuditCategory;
    action: string;
    details?: Record<string, unknown> | null;
    httpMethod: string;
    routePath: string;
    statusCode: number;
};

export type RecordRichAuditEntryInput = Omit<
    RecordAuditEntryInput,
    "httpMethod" | "routePath"
>;

export type AuditLogQuery = {
    actorId?: string;
    actorType?: string;
    applicantName?: string;
    applicantPhone?: string;
    applicationNumber?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pageSize?: string;
    search?: string;
};

export type AuditLogRow = {
    action: string;
    actor_email: string | null;
    actor_id: string | null;
    actor_name: string | null;
    actor_role: string | null;
    actor_type: AuditActorType;
    applicant_full_name: string | null;
    applicant_phone: string | null;
    application_id: string | null;
    application_number: string | null;
    category: AuditCategory;
    created_at: Date;
    details: Record<string, unknown> | null;
    http_method: string;
    id: string;
    route_path: string;
    status_code: number;
    total_count: string;
};
