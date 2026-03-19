import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Camera, QrCode, UserCircle2 } from "lucide-react";
import {
  getAccessToken,
  getMyUserProfile,
  getMyVirtualCard,
  resolveApiAssetUrl,
  updateMyUserProfile,
  uploadMyUserAvatar,
} from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";
import { useAuth } from "@/portal/auth-context";
import { Panel } from "@/portal/panel";
import { PortalShell } from "@/portal/portal-shell";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function parseAuthUser(data: Record<string, unknown>): AuthUser {
  return {
    id: String(data.id || ""),
    email: String(data.email || ""),
    role: String(data.role || "DOCTOR") as AuthUser["role"],
    orgId: String(data.organizationId || data.orgId || ""),
    organization: String(data.organization || ""),
    patientProfileId: data.patientProfileId ? String(data.patientProfileId) : null,
    displayName: data.displayName ? String(data.displayName) : null,
    avatarUrl: data.avatarUrl ? String(data.avatarUrl) : null,
  };
}

export default function PortalProfilePage() {
  const qc = useQueryClient();
  const { user, setSession } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const profileQuery = useQuery({
    queryKey: ["portal", "profile", "me"],
    queryFn: getMyUserProfile,
  });

  const cardQuery = useQuery({
    queryKey: ["portal", "profile", "virtual-card"],
    queryFn: getMyVirtualCard,
  });

  const profile = asRecord(profileQuery.data);

  const updateProfileMutation = useMutation({
    mutationFn: () => updateMyUserProfile({ displayName: displayName.trim() || undefined }),
    onSuccess: (data) => {
      const parsed = parseAuthUser(asRecord(data));
      const token = getAccessToken();
      if (token) setSession(token, parsed);
      qc.invalidateQueries({ queryKey: ["portal", "profile", "me"] });
      qc.invalidateQueries({ queryKey: ["portal", "profile", "virtual-card"] });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: () => uploadMyUserAvatar(avatarFile as File),
    onSuccess: (data) => {
      const parsed = parseAuthUser(asRecord(data));
      const token = getAccessToken();
      if (token) setSession(token, parsed);
      setAvatarFile(null);
      qc.invalidateQueries({ queryKey: ["portal", "profile", "me"] });
      qc.invalidateQueries({ queryKey: ["portal", "profile", "virtual-card"] });
    },
  });

  const virtualCard = asRecord(cardQuery.data);
  const roleTheme = asRecord(virtualCard.roleTheme);
  const themePrimary = String(roleTheme.primary || "#14B8A6");
  const themeAccent = String(roleTheme.accent || "#0EA5E9");
  const avatarUrl = resolveApiAssetUrl(String(profile.avatarUrl || user?.avatarUrl || ""));
  const currentName = String(profile.displayName || user?.displayName || "").trim();
  const currentEmail = String(profile.email || user?.email || "");
  const previewUrl = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  function onUpdateProfile(e: FormEvent) {
    e.preventDefault();
    updateProfileMutation.mutate();
  }

  function onUploadAvatar(e: FormEvent) {
    e.preventDefault();
    if (!avatarFile) return;
    avatarMutation.mutate();
  }

  return (
    <PortalShell title="Profile and Virtual ID">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <Panel
          title="Profile Photo and Name"
          eyebrow="Identity"
          description="Every role can update their photo and display name for faster recognition across portal workflows."
        >
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
              {previewUrl || avatarUrl ? (
                <img
                  src={previewUrl || avatarUrl}
                  alt={currentName || currentEmail}
                  className="h-24 w-24 rounded-full border border-white/15 object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-primary">
                  <UserCircle2 className="h-12 w-12" strokeWidth={1.6} />
                </div>
              )}
              <div className="min-w-0 text-center sm:text-left">
                <p className="font-display text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {currentName || "Set your display name"}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{currentEmail || "No email"}</p>
                <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                  Role {String(profile.role || user?.role || "-")}
                </p>
              </div>
            </div>

            <form onSubmit={onUploadAvatar} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Change photo</p>
              <label className="mt-3 flex h-11 cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground">
                <span className="truncate pr-3">{avatarFile ? avatarFile.name : "Upload profile photo"}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                  <Camera className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Browse
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
              </label>
              <button
                type="submit"
                disabled={!avatarFile || avatarMutation.isPending}
                className="mt-3 h-10 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
              >
                {avatarMutation.isPending ? "Uploading..." : "Update Photo"}
              </button>
            </form>

            <form onSubmit={onUpdateProfile} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-primary/70">Display name</p>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={currentName || "Enter display name"}
                className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-background/70 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
              />
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="mt-3 h-10 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Name"}
              </button>
            </form>
          </div>
        </Panel>

        <Panel
          title="Virtual Role Card"
          eyebrow="Color-Coded QR ID"
          description="Each user gets a role-themed virtual card with QR for quick identification."
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div
              className="rounded-[26px] border p-5"
              style={{
                borderColor: `${themePrimary}55`,
                background: `linear-gradient(135deg, ${themePrimary}20, ${themeAccent}12)`,
              }}
            >
              <p className="text-xs uppercase tracking-[0.22em] text-foreground/75">Aarogya360 Virtual Card</p>
              <p className="mt-3 font-display text-2xl font-bold tracking-[-0.03em] text-foreground">
                {String(virtualCard.holderName || currentName || "Portal User")}
              </p>
              <p className="mt-1 text-sm text-foreground/80">{String(virtualCard.email || currentEmail || "-")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-foreground/85">
                  {String(virtualCard.role || profile.role || "-")}
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-foreground/85">
                  {String(roleTheme.label || "Role Theme")}
                </span>
              </div>
              <p className="mt-4 text-xs text-foreground/70">Card ID: {String(virtualCard.cardId || "-")}</p>
              <p className="mt-1 text-xs text-foreground/70">Org: {String(virtualCard.organization || profile.organization || "-")}</p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary/70">
                <QrCode className="h-4 w-4" strokeWidth={1.8} />
                QR Identity
              </p>
              <div className="mt-3 flex items-center justify-center rounded-xl border border-white/10 bg-white/90 p-3">
                {virtualCard.qrDataUrl ? (
                  <img
                    src={String(virtualCard.qrDataUrl)}
                    alt="Virtual card QR"
                    className="h-52 w-52 object-contain"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Generating QR...</p>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Use this card for quick role verification and operator identity in shared workflows.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {profileQuery.isError ? <p className="mt-3 text-secondary">Unable to load profile.</p> : null}
      {cardQuery.isError ? <p className="mt-2 text-secondary">Unable to load virtual card.</p> : null}
      {avatarMutation.isError ? <p className="mt-2 text-secondary">Unable to update profile photo.</p> : null}
      {updateProfileMutation.isError ? <p className="mt-2 text-secondary">Unable to update display name.</p> : null}
    </PortalShell>
  );
}
