import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { acceptInvitation } from "wasp/client/operations";
import { useAuth } from "wasp/client/auth";
import { AppLayout } from "../layout/AppLayout";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export function AcceptInvitationPage({ user }: { user: any }) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No invitation token provided");
      return;
    }

    acceptInvitation({ token })
      .then((result: any) => {
        setStatus("success");
        setOrgName(result.organization?.name ?? "the organization");
        setTimeout(() => {
          navigate("/app/dashboard");
        }, 2000);
      })
      .catch((err: any) => {
        setStatus("error");
        setMessage(err.message || "Failed to accept invitation");
      });
  }, [token, navigate]);

  return (
    <AppLayout user={user}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <h2 className="mt-4 text-xl font-semibold">Accepting Invitation...</h2>
              <p className="mt-2 text-muted-foreground">
                Please wait while we process your invitation.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h2 className="mt-4 text-xl font-semibold">Welcome to {orgName}!</h2>
              <p className="mt-2 text-muted-foreground">
                You have successfully joined the organization. Redirecting to dashboard...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-red-500" />
              <h2 className="mt-4 text-xl font-semibold">Invitation Failed</h2>
              <p className="mt-2 text-muted-foreground">{message}</p>
              <button
                onClick={() => navigate("/app/dashboard")}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Go to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
