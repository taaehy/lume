"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { evidenceMaxMb, evidenceMaxBytes } from "@/lib/validation/evidence";

export function AttachmentUploader({ friendlyId }: { friendlyId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    const file = body.get("file");
    if (file instanceof File && file.size > evidenceMaxBytes) {
      setMessage(`Selecione um arquivo de até ${evidenceMaxMb} MB.`);
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/bugs/${friendlyId}/attachments`, {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset();
      setMessage("Evidência salva.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o arquivo.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <label className="block text-sm font-medium">
        Adicionar evidência
        <input
          name="file"
          type="file"
          required
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,application/pdf,text/plain,application/json"
          className="mt-2 block w-full text-sm"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Até {evidenceMaxMb} MB por arquivo. Os arquivos ficam privados e só
        podem ser acessados pela equipe do projeto.
      </p>
      <Button size="sm" disabled={pending}>
        {pending ? "Enviando…" : "Enviar arquivo"}
      </Button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
