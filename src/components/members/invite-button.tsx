"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { InviteDialog } from "@/components/shared/invite-dialog";

interface InviteButtonProps {
    organizationName: string;
}

export function InviteButton({ organizationName }: InviteButtonProps) {
    const [showInviteDialog, setShowInviteDialog] = useState(false);

    return (
        <>
            <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
            </Button>

            <InviteDialog
                open={showInviteDialog}
                onOpenChange={setShowInviteDialog}
                organizationName={organizationName}
            />
        </>
    );
}
