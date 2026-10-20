import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DocumentEditor } from "@/components/document-editor";
import { EditorSkeleton } from "@/components/editor-skeleton";
import { getDocumentAccess } from "@/lib/documents";
import { getCurrentUser } from "@/lib/session";
import { idSchema } from "@/lib/validation";

export default function DocumentPage(props: PageProps<"/documents/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Editor params={props.params} />
    </Suspense>
  );
}

async function Editor({ params }: Pick<PageProps<"/documents/[id]">, "params">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // No access looks exactly like "doesn't exist".
  if (!(await getDocumentAccess(id, user.id))) notFound();

  // The editor loads the document itself through the API; see components/document-editor.tsx.
  return <DocumentEditor key={id} documentId={id} />;
}
