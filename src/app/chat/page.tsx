import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { ChatRoom } from "@/components/chat/ChatRoom";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <AppShell title="Chat">
      <ChatRoom />
    </AppShell>
  );
}
