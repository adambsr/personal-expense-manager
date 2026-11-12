import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, CircleUserRound, LoaderCircle, UserRound, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ProfileAvatar } from "@/components/profile-avatar";
import { DashboardReturnLink } from "@/components/dashboard-return-link";
import { DashboardSidebar } from "@/features/dashboard/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/use-auth";
import { AuthApiError, deleteCurrentUserAvatar, updateCurrentUser, uploadCurrentUserAvatar } from "@/features/auth/auth-api";
import { getAccessToken } from "@/features/auth/auth-session";
import { toast } from "sonner";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80, "Use 80 characters or fewer."),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80, "Use 80 characters or fewer."),
});

type ProfileValues = z.infer<typeof profileSchema>;
const MAX_AVATAR_SIZE = 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formattedDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(value));
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatarOnSave, setRemoveAvatarOnSave] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" },
  });

  useEffect(() => {
    reset({ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" });
  }, [reset, user?.firstName, user?.lastName]);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  async function saveProfile(values: ProfileValues) {
    const token = getAccessToken();
    if (!token || !user) {
      setErrorMessage("Your session has ended. Sign in again to update your profile.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    let updatedUser = user;
    try {
      if (isDirty) {
        updatedUser = await updateCurrentUser(token, values);
        updateUser(updatedUser);
        reset({ firstName: updatedUser.firstName, lastName: updatedUser.lastName });
      }

      if (avatarFile) {
        const avatarUpdatedAt = await uploadCurrentUserAvatar(token, avatarFile);
        updatedUser = { ...updatedUser, avatarUpdatedAt };
      } else if (removeAvatarOnSave) {
        updatedUser = await deleteCurrentUserAvatar(token);
      }

      updateUser(updatedUser);
      setAvatarFile(null);
      setRemoveAvatarOnSave(false);
      setAvatarPreview(null);
      toast.success("Profile changes saved.");
    } catch (error) {
      const message = error instanceof AuthApiError ? error.message : "We could not save your profile. Try again.";
      if (updatedUser !== user) updateUser(updatedUser);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function selectAvatar(file: File | undefined) {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      setErrorMessage("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size === 0 || file.size > MAX_AVATAR_SIZE) {
      setErrorMessage("Choose an image smaller than 1 MB.");
      return;
    }

    setErrorMessage(null);
    setRemoveAvatarOnSave(false);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function stageAvatarRemoval() {
    setErrorMessage(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatarOnSave(Boolean(user?.avatarUpdatedAt));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function cancelAvatarChanges() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatarOnSave(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="app-shell">
      <DashboardSidebar activePage={null} />
      <main className="dashboard-main profile-page">
      <header className="page-header profile-page-header">
        <div className="page-heading">
          <DashboardReturnLink />
          <h1>My Profile</h1>
          <p>Manage your personal details and account picture.</p>
        </div>
      </header>

      <Card className="profile-card">
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>These details are private to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="profile-picture-row">
            <div className="profile-picture-preview">
              {avatarPreview ? <img src={avatarPreview} alt="Profile picture preview" /> : removeAvatarOnSave ? <CircleUserRound aria-hidden="true" /> : <ProfileAvatar className="profile-avatar-large" />}
            </div>
            <div className="profile-picture-copy">
              <strong>Profile picture</strong>
              <span>PNG, JPEG, or WebP · up to 1 MB</span>
              <input
                ref={fileInputRef}
                className="profile-file-input"
                id="profile-picture"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Choose a profile picture"
                disabled={saving}
                onChange={(event) => selectAvatar(event.currentTarget.files?.[0])}
              />
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => fileInputRef.current?.click()}>
                <Camera data-icon="inline-start" />
                {avatarFile ? "Choose another picture" : "Change picture"}
              </Button>
              {avatarFile ? <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={cancelAvatarChanges}><X data-icon="inline-start" />Discard selection</Button> : null}
              {user?.avatarUpdatedAt && !removeAvatarOnSave ? <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={stageAvatarRemoval}>Remove profile picture</Button> : null}
              {removeAvatarOnSave ? <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setRemoveAvatarOnSave(false)}>Undo removal</Button> : null}
              {avatarFile ? <span className="profile-picture-pending" role="status">Picture will be saved with your changes.</span> : null}
              {removeAvatarOnSave ? <span className="profile-picture-pending" role="status">Picture will be removed when you save.</span> : null}
            </div>
          </div>

          <form className="profile-edit-form" onSubmit={handleSubmit(saveProfile)} noValidate>
            <div className="profile-fields">
              <div className="profile-field">
                <label htmlFor="first-name">First name</label>
                <Input id="first-name" autoComplete="given-name" aria-invalid={Boolean(errors.firstName)} {...register("firstName")} />
                {errors.firstName ? <span className="profile-field-error">{errors.firstName.message}</span> : null}
              </div>
              <div className="profile-field">
                <label htmlFor="last-name">Last name</label>
                <Input id="last-name" autoComplete="family-name" aria-invalid={Boolean(errors.lastName)} {...register("lastName")} />
                {errors.lastName ? <span className="profile-field-error">{errors.lastName.message}</span> : null}
              </div>
              <div className="profile-field profile-field-wide">
                <label htmlFor="profile-email">Email address</label>
                <Input id="profile-email" type="email" value={user?.email ?? ""} readOnly aria-readonly="true" />
                <span className="profile-field-hint">Email address cannot be changed here.</span>
              </div>
            </div>

            <dl className="profile-account-meta">
              <div><dt>Member since</dt><dd>{user ? formattedDate(user.createdAt) : "—"}</dd></div>
            </dl>

            {errorMessage ? <p className="profile-error" role="alert">{errorMessage}</p> : null}

            <div className="profile-form-actions">
              <Button type="submit" disabled={saving || (!isDirty && !avatarFile && !removeAvatarOnSave)}>
                {saving ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <UserRound data-icon="inline-start" />}
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
