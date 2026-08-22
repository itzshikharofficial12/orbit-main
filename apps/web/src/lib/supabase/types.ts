export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrbitRole = "SUPER_ADMIN" | "CLIENT" | "EMPLOYEE";
export type EmployeeJobRole =
  | "PROJECT_MANAGER"
  | "DEVELOPER"
  | "DESIGNER"
  | "CONTENT"
  | "MARKETING"
  | "SALES"
  | "OTHER";
export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type ClientStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

export type ServiceType =
  | "BRAND_FOUNDATION"
  | "SAAS_WEBSITE"
  | "GROWTH_ENGINE"
  | "AI_OPERATIONS";

export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "IN_REVIEW"
  | "COMPLETED"
  | "ARCHIVED";

export type MilestoneStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type DeliverableStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "READY_FOR_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "ARCHIVED";

export type ClientRequestStatus = "OPEN" | "IN_PROGRESS" | "WAITING_FOR_CLIENT" | "RESOLVED" | "CLOSED";
export type ClientRequestPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export type BillingType =
  | "ONE_TIME"
  | "INSTALLMENTS"
  | "RECURRING"
  | "MILESTONE"
  | "CUSTOM"
  | "HYBRID";

export type BillingPlanStatus =
  | "DRAFT"
  | "ACTIVE"
  | "COMPLETED"
  | "PAUSED"
  | "CANCELLED";

export type BillingScheduleStatus =
  | "SCHEDULED"
  | "DUE"
  | "PAID"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "WAIVED";

export type PaymentMethod = "RAZORPAY" | "BANK_TRANSFER";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PENDING_VERIFICATION"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export interface Database {
  public: {
    Tables: {
      client_pm_history: {
        Row: {
          id: string;
          client_id: string;
          previous_pm_id: string | null;
          new_pm_id: string | null;
          changed_by: string | null;
          changed_at: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          previous_pm_id?: string | null;
          new_pm_id?: string | null;
          changed_by?: string | null;
          changed_at?: string;
          note?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          previous_pm_id?: string | null;
          new_pm_id?: string | null;
          changed_by?: string | null;
          changed_at?: string;
          note?: string | null;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          status: ClientStatus;
          primary_contact_name: string;
          primary_contact_email: string;
          primary_contact_phone: string | null;
          project_manager_id?: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status?: ClientStatus;
          primary_contact_name: string;
          primary_contact_email: string;
          primary_contact_phone?: string | null;
          project_manager_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: ClientStatus;
          primary_contact_name?: string;
          primary_contact_email?: string;
          primary_contact_phone?: string | null;
          project_manager_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          role: OrbitRole;
          job_role?: EmployeeJobRole | null;
          department?: string | null;
          bio?: string | null;
          status?: EmployeeStatus | null;
          phone?: string | null;
          is_project_manager?: boolean;
          avatar_url: string | null;
          client_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: OrbitRole;
          job_role?: EmployeeJobRole | null;
          department?: string | null;
          bio?: string | null;
          status?: EmployeeStatus | null;
          phone?: string | null;
          is_project_manager?: boolean;
          avatar_url?: string | null;
          client_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: OrbitRole;
          job_role?: EmployeeJobRole | null;
          department?: string | null;
          bio?: string | null;
          status?: EmployeeStatus | null;
          phone?: string | null;
          is_project_manager?: boolean;
          avatar_url?: string | null;
          client_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      user_preferences: {
        Row: {
          user_id: string;
          in_app_notifications: boolean;
          notification_sound: boolean;
          email_notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          in_app_notifications?: boolean;
          notification_sound?: boolean;
          email_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          in_app_notifications?: boolean;
          notification_sound?: boolean;
          email_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      projects: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          description: string | null;
          service_type: ServiceType;
          status: ProjectStatus;
          start_date: string | null;
          target_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          description?: string | null;
          service_type: ServiceType;
          status?: ProjectStatus;
          start_date?: string | null;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          description?: string | null;
          service_type?: ServiceType;
          status?: ProjectStatus;
          start_date?: string | null;
          target_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      milestones: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          status: MilestoneStatus;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          status?: MilestoneStatus;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          status?: MilestoneStatus;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          milestone_id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          due_date: string | null;
          client_visible: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          milestone_id: string;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          due_date?: string | null;
          client_visible?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          milestone_id?: string;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          due_date?: string | null;
          client_visible?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_milestone_id_fkey";
            columns: ["milestone_id"];
            isOneToOne: false;
            referencedRelation: "milestones";
            referencedColumns: ["id"];
          }
        ];
      };
      deliverables: {
        Row: {
          id: string;
          project_id: string;
          milestone_id: string | null;
          title: string;
          description: string | null;
          status: DeliverableStatus;
          expected_delivery_date: string | null;
          url: string | null;
          client_visible: boolean;
          notes: string | null;
          position: number;
          submitted_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          changes_requested_at: string | null;
          changes_requested_by: string | null;
          client_feedback: string | null;
          submission_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          milestone_id?: string | null;
          title: string;
          description?: string | null;
          status?: DeliverableStatus;
          expected_delivery_date?: string | null;
          url?: string | null;
          client_visible?: boolean;
          notes?: string | null;
          position?: number;
          submitted_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          changes_requested_at?: string | null;
          changes_requested_by?: string | null;
          client_feedback?: string | null;
          submission_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          milestone_id?: string | null;
          title?: string;
          description?: string | null;
          status?: DeliverableStatus;
          expected_delivery_date?: string | null;
          url?: string | null;
          client_visible?: boolean;
          notes?: string | null;
          position?: number;
          submitted_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          changes_requested_at?: string | null;
          changes_requested_by?: string | null;
          client_feedback?: string | null;
          submission_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deliverables_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deliverables_milestone_id_fkey";
            columns: ["milestone_id"];
            isOneToOne: false;
            referencedRelation: "milestones";
            referencedColumns: ["id"];
          }
        ];
      };
      client_requests: {
        Row: {
          id: string;
          client_id: string;
          project_id: string | null;
          deliverable_id: string | null;
          title: string;
          description: string;
          status: ClientRequestStatus;
          priority: ClientRequestPriority;
          created_by: string;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
          reference_number: string | null;
          category: string;
          payment_id: string | null;
          meeting_id: string | null;
          schedule_item_id: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          project_id?: string | null;
          deliverable_id?: string | null;
          title: string;
          description: string;
          status?: ClientRequestStatus;
          priority?: ClientRequestPriority;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          reference_number?: string | null;
          category?: string;
          payment_id?: string | null;
          meeting_id?: string | null;
          schedule_item_id?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          project_id?: string | null;
          deliverable_id?: string | null;
          title?: string;
          description?: string;
          status?: ClientRequestStatus;
          priority?: ClientRequestPriority;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          reference_number?: string | null;
          category?: string;
          payment_id?: string | null;
          meeting_id?: string | null;
          schedule_item_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_requests_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_requests_deliverable_id_fkey";
            columns: ["deliverable_id"];
            isOneToOne: false;
            referencedRelation: "deliverables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_requests_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_requests_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      request_messages: {
        Row: {
          id: string;
          request_id: string;
          sender_id: string;
          message: string;
          is_internal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          sender_id: string;
          message: string;
          is_internal?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          sender_id?: string;
          message?: string;
          is_internal?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "request_messages_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "client_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: string;
          title: string;
          message: string;
          link: string | null;
          is_read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          type: string;
          title: string;
          message: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          type?: string;
          title?: string;
          message?: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      meetings: {
        Row: {
          id: string;
          client_id: string;
          project_id: string | null;
          title: string;
          description: string | null;
          meeting_url: string;
          starts_at: string;
          ends_at: string;
          status: MeetingStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
          cancelled_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          project_id?: string | null;
          title: string;
          description?: string | null;
          meeting_url: string;
          starts_at: string;
          ends_at: string;
          status?: MeetingStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          cancelled_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          project_id?: string | null;
          title?: string;
          description?: string | null;
          meeting_url?: string;
          starts_at?: string;
          ends_at?: string;
          status?: MeetingStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          cancelled_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      billing_plans: {
        Row: {
          id: string;
          client_id: string;
          project_id: string | null;
          name: string;
          description: string | null;
          billing_type: BillingType;
          total_contract_value: number;
          currency: string;
          start_date: string;
          end_date: string | null;
          status: BillingPlanStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          project_id?: string | null;
          name: string;
          description?: string | null;
          billing_type: BillingType;
          total_contract_value?: number;
          currency?: string;
          start_date?: string;
          end_date?: string | null;
          status?: BillingPlanStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          project_id?: string | null;
          name?: string;
          description?: string | null;
          billing_type?: BillingType;
          total_contract_value?: number;
          currency?: string;
          start_date?: string;
          end_date?: string | null;
          status?: BillingPlanStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "billing_plans_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "billing_plans_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "billing_plans_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      billing_schedule_items: {
        Row: {
          id: string;
          billing_plan_id: string;
          client_id: string;
          project_id: string | null;
          invoice_number: string | null;
          title: string;
          description: string | null;
          amount: number;
          tax_amount: number;
          currency: string;
          due_date: string | null;
          issue_date: string;
          scheduled_for: string | null;
          sequence_number: number;
          milestone_id: string | null;
          recurrence_reference: string | null;
          status: BillingScheduleStatus;
          notes: string | null;
          terms: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          billing_plan_id: string;
          client_id: string;
          project_id?: string | null;
          invoice_number?: string | null;
          title: string;
          description?: string | null;
          amount: number;
          tax_amount?: number;
          currency?: string;
          due_date?: string | null;
          issue_date?: string;
          scheduled_for?: string | null;
          sequence_number?: number;
          milestone_id?: string | null;
          recurrence_reference?: string | null;
          status?: BillingScheduleStatus;
          notes?: string | null;
          terms?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          billing_plan_id?: string;
          client_id?: string;
          project_id?: string | null;
          invoice_number?: string | null;
          title?: string;
          description?: string | null;
          amount?: number;
          tax_amount?: number;
          currency?: string;
          due_date?: string | null;
          issue_date?: string;
          scheduled_for?: string | null;
          sequence_number?: number;
          milestone_id?: string | null;
          recurrence_reference?: string | null;
          status?: BillingScheduleStatus;
          notes?: string | null;
          terms?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "billing_schedule_items_billing_plan_id_fkey";
            columns: ["billing_plan_id"];
            isOneToOne: false;
            referencedRelation: "billing_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "billing_schedule_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "billing_schedule_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "billing_schedule_items_milestone_id_fkey";
            columns: ["milestone_id"];
            isOneToOne: false;
            referencedRelation: "milestones";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          receipt_number: string | null;
          billing_schedule_item_id: string | null;
          client_id: string;
          project_id: string | null;
          amount: number;
          currency: string;
          method: PaymentMethod;
          status: PaymentStatus;
          transaction_reference: string | null;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          paid_at: string | null;
          submitted_at: string | null;
          verified_at: string | null;
          verified_by: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          receipt_number?: string | null;
          billing_schedule_item_id?: string | null;
          client_id: string;
          project_id?: string | null;
          amount: number;
          currency?: string;
          method?: PaymentMethod;
          status?: PaymentStatus;
          transaction_reference?: string | null;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          paid_at?: string | null;
          submitted_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          receipt_number?: string | null;
          billing_schedule_item_id?: string | null;
          client_id?: string;
          project_id?: string | null;
          amount?: number;
          currency?: string;
          method?: PaymentMethod;
          status?: PaymentStatus;
          transaction_reference?: string | null;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          paid_at?: string | null;
          submitted_at?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_billing_schedule_item_id_fkey";
            columns: ["billing_schedule_item_id"];
            isOneToOne: false;
            referencedRelation: "billing_schedule_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      razorpay_webhook_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          payload: Json;
          processed_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          event_type: string;
          payload: Json;
          processed_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          event_type?: string;
          payload?: Json;
          processed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_current_client_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
    };
    Enums: {
      orbit_role: OrbitRole;
      client_status: ClientStatus;
      service_type: ServiceType;
      project_status: ProjectStatus;
      milestone_status: MilestoneStatus;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      deliverable_status: DeliverableStatus;
      client_request_status: ClientRequestStatus;
      client_request_priority: ClientRequestPriority;
      meeting_status: MeetingStatus;
      billing_type: BillingType;
      billing_plan_status: BillingPlanStatus;
      billing_schedule_status: BillingScheduleStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type UserPreferences = Database["public"]["Tables"]["user_preferences"]["Row"];
export type UserPreferencesInsert = Database["public"]["Tables"]["user_preferences"]["Insert"];
export type UserPreferencesUpdate = Database["public"]["Tables"]["user_preferences"]["Update"];

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export type Milestone = Database["public"]["Tables"]["milestones"]["Row"];
export type MilestoneInsert = Database["public"]["Tables"]["milestones"]["Insert"];
export type MilestoneUpdate = Database["public"]["Tables"]["milestones"]["Update"];

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export type Deliverable = Database["public"]["Tables"]["deliverables"]["Row"];
export type DeliverableInsert = Database["public"]["Tables"]["deliverables"]["Insert"];
export type DeliverableUpdate = Database["public"]["Tables"]["deliverables"]["Update"];

export type ClientRequest = Database["public"]["Tables"]["client_requests"]["Row"];
export type ClientRequestInsert = Database["public"]["Tables"]["client_requests"]["Insert"];
export type ClientRequestUpdate = Database["public"]["Tables"]["client_requests"]["Update"];

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];

export type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
export type MeetingInsert = Database["public"]["Tables"]["meetings"]["Insert"];
export type MeetingUpdate = Database["public"]["Tables"]["meetings"]["Update"];

export type BillingPlan = Database["public"]["Tables"]["billing_plans"]["Row"];
export type BillingPlanInsert = Database["public"]["Tables"]["billing_plans"]["Insert"];
export type BillingPlanUpdate = Database["public"]["Tables"]["billing_plans"]["Update"];

export type BillingScheduleItem = Database["public"]["Tables"]["billing_schedule_items"]["Row"];
export type BillingScheduleItemInsert = Database["public"]["Tables"]["billing_schedule_items"]["Insert"];
export type BillingScheduleItemUpdate = Database["public"]["Tables"]["billing_schedule_items"]["Update"];

export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];
