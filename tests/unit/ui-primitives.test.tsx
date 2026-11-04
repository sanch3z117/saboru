import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

describe("primitivas de UI", () => {
  it("renderiza un botón como enlace con asChild", () => {
    render(
      <Button asChild>
        <a href="/buscar">Buscar</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Buscar" });
    expect(link).toHaveAttribute("href", "/buscar");
    expect(link).toHaveAttribute("data-slot", "button");
  });

  it("renderiza un chip como enlace con asChild", () => {
    render(
      <Chip asChild tone="active">
        <a href="/buscar?categoria=almuerzos">Almuerzos</a>
      </Chip>,
    );

    expect(screen.getByRole("link", { name: "Almuerzos" })).toHaveAttribute(
      "data-slot",
      "chip",
    );
  });

  it("comunica error y éxito con roles accesibles", () => {
    render(
      <>
        <Alert tone="error">No pudimos guardar.</Alert>
        <Alert tone="success">Reseña publicada.</Alert>
      </>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos guardar.");
    expect(screen.getByRole("status")).toHaveTextContent("Reseña publicada.");
  });

  it("compone card, badge, input y skeleton", () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <Badge tone="campus">Destacado</Badge>
          <CardTitle>Cafetería Central</CardTitle>
          <CardDescription>Almuerzos del campus</CardDescription>
        </CardHeader>
        <Input aria-label="Presupuesto" />
        <Skeleton className="h-4 w-24" />
      </Card>,
    );

    expect(
      screen.getByRole("heading", { name: "Cafetería Central" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Presupuesto")).toHaveAttribute(
      "data-slot",
      "input",
    );
    expect(container.querySelector('[data-slot="skeleton"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("no renderiza el contenido de un diálogo cerrado", () => {
    render(
      <Dialog>
        <DialogTrigger>Abrir ficha</DialogTrigger>
        <DialogContent>
          <DialogTitle>Ficha del local</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(
      screen.getByRole("button", { name: "Abrir ficha" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ficha del local")).not.toBeInTheDocument();
  });
});
