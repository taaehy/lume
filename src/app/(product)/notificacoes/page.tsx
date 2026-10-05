import { PageHeader } from "@/components/product/page-header";
import { RecordPanel } from "@/components/product/record-panel";
import { ApiForm } from "@/components/product/api-form";
import { workspaceScope } from "@/lib/data/scope";
import { prisma } from "@/lib/db/prisma";

import Link from "next/link";
export default async function NotificationsPage() {
  const scope = await workspaceScope();
  const items = await prisma.notification.findMany({
    where: { organizationId: scope.organizationId, userId: scope.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
      <PageHeader
        title="Notificações"
        eyebrow={scope.organizationName}
        description="Alterações de bugs e releases que dizem respeito a você."
      />
      <RecordPanel
        title={`${items.filter((item) => !item.readAt).length} não lidas`}
      >
        <div className="mb-4">
          <ApiForm
            endpoint="/api/notifications"
            method="PATCH"
            submitLabel="Marcar todas como lidas"
          />
        </div>
        {items.length ? (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="space-y-3 py-4">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.body}</p>
                <div className="flex flex-wrap items-center gap-4">
                  <time className="text-xs text-muted-foreground">
                    {item.createdAt.toLocaleString("pt-BR")}
                  </time>
                  {item.href && (
                    <Link
                      className="text-sm text-primary underline"
                      href={item.href}
                    >
                      Ver registro
                    </Link>
                  )}
                  {!item.readAt && (
                    <ApiForm
                      endpoint={`/api/notifications/${item.id}`}
                      method="PATCH"
                      submitLabel="Marcar como lida"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma notificação por enquanto.
          </p>
        )}
      </RecordPanel>
    </div>
  );
}
