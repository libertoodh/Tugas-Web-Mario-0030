"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { Save } from "lucide-react";
import { roomSchema } from "@/lib/validation";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";

interface RoomFormValues {
  name: string;
  building: string;
  floor: number;
  capacity: number;
  category: string;
  imageUrl: string;
  facilitiesText: string;
  description: string;
}

export function RoomForm({
  room,
}: {
  room?: {
    id: string;
    name: string;
    building: string;
    floor: number;
    capacity: number;
    category: string | null;
    imageUrl: string | null;
    facilities: string[];
    description: string | null;
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(room);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormValues>({
    resolver: zodResolver(
      roomSchema
        .omit({ facilities: true, isActive: true })
        .extend({}),
    ) as unknown as Resolver<RoomFormValues>,
    defaultValues: {
      name: room?.name ?? "",
      building: room?.building ?? "",
      floor: room?.floor ?? 1,
      capacity: room?.capacity ?? 30,
      category: room?.category ?? "",
      imageUrl: room?.imageUrl ?? "",
      facilitiesText: room?.facilities.join(", ") ?? "",
      description: room?.description ?? "",
    },
  });

  async function onSubmit(values: RoomFormValues) {
    setServerError(null);
    const facilities = values.facilitiesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      name: values.name,
      building: values.building,
      floor: Number(values.floor),
      capacity: Number(values.capacity),
      category: values.category,
      imageUrl: values.imageUrl,
      facilities,
      description: values.description,
    };

    const response = await fetch(isEdit ? `/api/rooms/${room?.id}` : "/api/rooms", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message = body?.error?.message ?? "Gagal menyimpan ruangan.";
      setServerError(message);
      if (body?.error?.details && typeof body.error.details === "object") {
        for (const [field, fieldMessage] of Object.entries(body.error.details)) {
          if (typeof fieldMessage === "string") {
            setError(field as keyof RoomFormValues, { message: fieldMessage });
          }
        }
      }
      return;
    }

    toast({
      title: isEdit ? "Ruangan diperbarui" : "Ruangan ditambahkan",
      description: `${body.data.name} berhasil disimpan.`,
      variant: "success",
    });
    router.push("/admin/ruangan");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError ? <Alert variant="error">{serverError}</Alert> : null}

      <Card>
        <CardHeader
          title="Informasi ruangan"
          description="Perubahan langsung berlaku pada katalog dan formulir pengajuan."
        />
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama ruangan" htmlFor="name" error={errors.name?.message} required>
              <Input id="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            </Field>
            <Field label="Gedung" htmlFor="building" error={errors.building?.message} required>
              <Input id="building" aria-invalid={Boolean(errors.building)} {...register("building")} />
            </Field>
            <Field
              label="Lantai"
              htmlFor="floor"
              error={errors.floor?.message}
              hint="Isi 0 bila lantai belum tercatat."
              required
            >
              <Input
                id="floor"
                type="number"
                min={0}
                max={50}
                aria-invalid={Boolean(errors.floor)}
                {...register("floor")}
              />
            </Field>
            <Field
              label="Kapasitas (orang)"
              htmlFor="capacity"
              error={errors.capacity?.message}
              hint="Isi 0 bila kapasitas belum tercatat."
              required
            >
              <Input
                id="capacity"
                type="number"
                min={0}
                max={2000}
                aria-invalid={Boolean(errors.capacity)}
                {...register("capacity")}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Kategori"
              htmlFor="category"
              error={errors.category?.message}
              hint="Contoh: Studio, Laboratorium, Ruang Kelas, Aula & Pertemuan, Galeri."
            >
              <Input
                id="category"
                placeholder="Studio"
                aria-invalid={Boolean(errors.category)}
                {...register("category")}
              />
            </Field>
            <Field
              label="Foto ruangan"
              htmlFor="imageUrl"
              error={errors.imageUrl?.message}
              hint="Path lokal (mis. /images/ruangan/studio-gambar.jpg) atau URL http(s)."
            >
              <Input
                id="imageUrl"
                placeholder="/images/ruangan/studio-gambar.jpg"
                aria-invalid={Boolean(errors.imageUrl)}
                {...register("imageUrl")}
              />
            </Field>
          </div>

          <Field
            label="Fasilitas"
            htmlFor="facilitiesText"
            hint="Pisahkan dengan koma. Contoh: Proyektor, AC, Whiteboard"
          >
            <Input id="facilitiesText" {...register("facilitiesText")} />
          </Field>

          <Field label="Deskripsi" htmlFor="description" error={errors.description?.message}>
            <Textarea
              id="description"
              rows={4}
              placeholder="Keterangan singkat mengenai ruangan dan peruntukannya."
              {...register("description")}
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
        <Button type="submit" loading={isSubmitting}>
          <Save className="h-4 w-4" aria-hidden />
          {isEdit ? "Simpan perubahan" : "Tambahkan ruangan"}
        </Button>
      </div>
    </form>
  );
}
