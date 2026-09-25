import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  Plus,
  RotateCcw,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileArchive,
  Info,
} from "lucide-react";
import { Card, CardBody, Button, Badge, Alert, EmptyState, Modal } from "../components/ui";
import { PageHeader, Pagination } from "../components/ui";
import { backupsEndpoints } from "../services/endpoints";
import { getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { BackupItem } from "../types";
import "./Respaldos.css";

const PAGE_SIZE = 10;

const ESTADO_VARIANT: Record<string, "primary" | "secondary" | "success" | "warning" | "error" | "gray"> = {
  EXITOSO: "success",
  COMPLETADO: "success",
  EN_PROCESO: "warning",
  PENDIENTE: "gray",
  FALLIDO: "error",
};

const TIPO_LABEL: Record<string, string> = {
  MANUAL: "Manual",
  PERIODICO: "Periódico",
};

const formatearTamano = (bytes?: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const Respaldos: React.FC = () => {
  const { tieneRol } = useAuth();
  const esSuperAdmin = tieneRol("SUPERADMIN");

  const [items, setItems] = useState<BackupItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [creando, setCreando] = useState(false);
  const [restaurando, setRestaurando] = useState<number | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<BackupItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BackupItem | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const response = await backupsEndpoints.listar({ page, page_size: PAGE_SIZE });
      setItems(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [page]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleCrear = async () => {
    setCreando(true);
    setError("");
    setExito("");
    try {
      const backup = await backupsEndpoints.crear();
      if (backup.estado === "FALLIDO") {
        setError("No se pudo generar el respaldo. Revise el estado de las herramientas.");
      } else {
        setExito(`Respaldo ${TIPO_LABEL[backup.tipo] || backup.tipo} generado correctamente (${backup.estado}).`);
      }
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreando(false);
    }
  };

  const handleRestaurar = async (id: number) => {
    setRestaurando(id);
    setError("");
    setExito("");
    try {
      const backup = await backupsEndpoints.restaurar(id);
      if (backup.estado === "FALLIDO") {
        setError("No se pudo restaurar el respaldo.");
      } else {
        setExito("Restauración del respaldo ejecutada correctamente.");
      }
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRestaurando(null);
      setConfirmRestore(null);
    }
  };

  const handleEliminar = async (id: number) => {
    setEliminando(id);
    setError("");
    setExito("");
    try {
      await backupsEndpoints.eliminar(id);
      setExito("Respaldo eliminado correctamente.");
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setEliminando(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="respaldos-page">
      <PageHeader
        title="Respaldos"
        subtitle="Copia de seguridad y restauración de la base de datos"
        icon={<Database size={24} />}
        actions={
          esSuperAdmin ? (
            <Button onClick={handleCrear} loading={creando} icon={<Plus size={18} />}>
              Generar Respaldo
            </Button>
          ) : undefined
        }
      />

      {!esSuperAdmin && (
        <Alert variant="warning">
          <Info size={20} />
          Solo el SUPERADMIN puede generar, restaurar o eliminar respaldos.
        </Alert>
      )}

      {exito && (
        <Alert variant="success" onClose={() => setExito("")}>
          <CheckCircle size={20} />
          {exito}
        </Alert>
      )}

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          <AlertCircle size={20} />
          {error}
        </Alert>
      )}

      {/* Lista de respaldos */}
      <Card>
        <CardBody>
          <div className="respaldos-table-header">
            <div>
              <h3>Historial de Respaldos</h3>
              <p>{total} registro(s)</p>
            </div>
          </div>

          {cargando ? (
            <div className="respaldos-cargando">
              <Loader2 size={26} className="spin" />
              <span>Cargando respaldos...</span>
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Database size={40} />}
              title="Sin respaldos"
              description="Aún no se han generado respaldos. Pulse 'Generar Respaldo'."
            />
          ) : (
            <>
              <div className="respaldos-table-wrap">
                <table className="respaldos-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Estado</th>
                      <th>Archivo</th>
                      <th>Tamaño</th>
                      <th>Inicio</th>
                      <th>Acciones</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((b) => (
                      <tr key={b.id}>
                        <td>{TIPO_LABEL[b.tipo] || b.tipo}</td>
                        <td>
                          <Badge variant={ESTADO_VARIANT[b.estado] || "gray"} size="sm">
                            {b.estado}
                          </Badge>
                        </td>
                        <td className="respaldos-mono">{b.archivo_nombre || "—"}</td>
                        <td>{formatearTamano(b.tamano_bytes)}</td>
                        <td className="respaldos-mono">
                          {b.fecha_inicio
                            ? new Date(b.fecha_inicio).toLocaleString("es-PE")
                            : "—"}
                        </td>
                        <td>
                          <div className="respaldos-acc">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<RotateCcw size={15} />}
                              disabled={b.estado !== "EXITOSO" || eliminando === b.id}
                              onClick={() => setConfirmRestore(b)}
                            >
                              Restaurar
                            </Button>
                            {esSuperAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="respaldos-btn-delete"
                                icon={<Trash2 size={15} />}
                                loading={eliminando === b.id}
                                onClick={() => setConfirmDelete(b)}
                                title="Eliminar respaldo"
                              >
                                Eliminar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="respaldos-pagination">
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Confirmación de restauración */}
      <Modal
        isOpen={!!confirmRestore}
        onClose={() => setConfirmRestore(null)}
        title="Restaurar Respaldo"
        size="sm"
      >
        <div className="restore-content">
          <FileArchive size={40} className="restore-icon" />
          <p>
            ¿Desea restaurar el respaldo (
            {confirmRestore ? TIPO_LABEL[confirmRestore.tipo] || confirmRestore.tipo : ""} -{" "}
            {confirmRestore?.estado})?
          </p>
          <p className="restore-warning">
            Esta operación reemplazará la información actual. Se recomienda generar un respaldo
            previo antes de continuar.
          </p>
          <div className="restore-actions">
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={restaurando === confirmRestore?.id}
              icon={<RotateCcw size={18} />}
              onClick={() => confirmRestore && handleRestaurar(confirmRestore.id)}
            >
              Restaurar Ahora
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmación de eliminación */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar Respaldo"
        size="sm"
      >
        <div className="restore-content">
          <Trash2 size={40} className="restore-icon" />
          <p>
            ¿Está seguro de eliminar el respaldo de{" "}
            {confirmDelete?.archivo_nombre || "este respaldo"}?
          </p>
          <p className="restore-warning">
            Esta acción eliminará el archivo físico y su registro. No se podrá restaurar.
          </p>
          <div className="restore-actions">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={eliminando === confirmDelete?.id}
              icon={<Trash2 size={18} />}
              onClick={() => confirmDelete && handleEliminar(confirmDelete.id)}
            >
              Eliminar Respaldo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};