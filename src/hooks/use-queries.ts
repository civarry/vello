import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============ Query Keys ============
export const queryKeys = {
  templates: ["templates"] as const,
  template: (id: string) => ["template", id] as const,
  organization: ["organization"] as const,
  members: ["members"] as const,
  invites: ["invites"] as const,
  smtpConfigs: ["smtp-configs"] as const,
  smtpConfig: (id: string) => ["smtp-config", id] as const,
  parameters: ["parameters"] as const,
};

// ============ Types ============
export interface Template {
  id: string;
  name: string;
  description: string | null;
  paperSize: string;
  orientation: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  logo: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: string;
  isCurrentUser: boolean;
}

export interface Invite {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  token?: string; // Only returned when creating new invite, not in list
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

// ============ Fetch Functions ============
async function fetchTemplates(): Promise<Template[]> {
  const response = await fetch("/api/templates");
  const result = await response.json();
  if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to fetch templates");
  return result.data;
}

async function fetchOrganization(): Promise<Organization> {
  const response = await fetch("/api/organization");
  const result = await response.json();
  if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to fetch organization");
  return result.data;
}

async function fetchMembers(): Promise<Member[]> {
  const response = await fetch("/api/members");
  const result = await response.json();
  if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to fetch members");
  return result.data;
}

async function fetchInvites(): Promise<Invite[]> {
  const response = await fetch("/api/invites");
  const result = await response.json();
  if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to fetch invites");
  return result.data;
}

// ============ Hooks ============

// Templates
export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: fetchTemplates,
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.details?.message || result.error || "Failed to delete template");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    },
  });
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/templates/${id}/duplicate`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to duplicate template");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    },
  });
}

// Organization
export function useOrganization() {
  return useQuery({
    queryKey: queryKeys.organization,
    queryFn: fetchOrganization,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name?: string; address?: string }) => {
      const response = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to update organization");
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.organization, data);
    },
  });
}

// Members
export function useMembers() {
  return useQuery({
    queryKey: queryKeys.members,
    queryFn: fetchMembers,
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/members/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.details?.message || result.error || "Failed to remove member");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const response = await fetch(`/api/members/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to update role");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

// Invites
export function useInvites() {
  return useQuery({
    queryKey: queryKeys.invites,
    queryFn: fetchInvites,
  });
}

export function useCancelInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/invites/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.details?.message || result.error || "Failed to cancel invite");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites });
    },
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to send invite");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites });
    },
  });
}

export function useGetInviteLink() {
  return useMutation({
    mutationFn: async (inviteId: string): Promise<{ token: string }> => {
      const response = await fetch(`/api/invites/${inviteId}/link`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to get invite link");
      return result.data;
    },
  });
}

// ============ Parameters ============

import type { OrganizationParameter } from "@/types/template";

async function fetchParameters(): Promise<OrganizationParameter[]> {
  const response = await fetch("/api/parameters");
  const result = await response.json();
  if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to fetch parameters");
  return result.data;
}

export function useParameters() {
  return useQuery({
    queryKey: queryKeys.parameters,
    queryFn: fetchParameters,
  });
}

export function useCreateParameter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      key: string;
      label: string;
      category: string;
      dataType: string;
      isRequired: boolean;
    }) => {
      const response = await fetch("/api/parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to create parameter");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parameters });
    },
  });
}

export function useUpdateParameter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      key?: string;
      label?: string;
      category?: string;
      dataType?: string;
      isRequired?: boolean;
      sortOrder?: number;
    }) => {
      const response = await fetch(`/api/parameters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.details?.message || result.error || "Failed to update parameter");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parameters });
    },
  });
}

export function useDeleteParameter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/parameters/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.details?.message || result.error || "Failed to delete parameter");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.parameters });
    },
  });
}
