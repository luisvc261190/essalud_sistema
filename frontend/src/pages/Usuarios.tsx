import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Lock,
  Unlock,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Trash2,
} from "lucide-react";
import { Card, CardBody, Button, Badge, Alert, Modal, Input, EmptyState } from "../components/ui";
import { PageHeader, Pagination } from "../components/ui";
import { usuariosEndpoints, rolesEndpoints, type UsuariosParams } from "../services/endpoints";
import { getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { UserItem, UserCreatePayload, UserUpdatePayload, Role } from "../types";
import "./Usuarios.css";

const PAGE_SIZE = 10;

const ROL_COLORS: Record<string, "primary" | "secondary" | "success" | "warning" | "error" | "gray"> = {
  SUPERADMIN: "primary",
  ADMIN: "secondary",
  OPERADOR: "success",
  CONSULTA: "gray",
};

interface UserModalState {
  abierto: boolean;
  usuario?: UserItem | null;
}

export const Usuarios: React.FC = () => {
  const { user, tieneRol, tienePermiso } = useAuth();
  const esSuperAdmin = tieneRol("SUPERADMIN");
  const esGestor = tienePermiso("GESTIONAR_USUARIOS");
  const puedeCrear = tienePermiso("CREAR_USUARIOS");

  const [usuarios, setUsuarios] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [modal, setModal] = useState<UserModalState>({ abierto: false, usuario: null });
  const [confirmarEliminar, setConfirmarEliminar] = useState<UserItem | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const params: UsuariosParams = { page, page_size: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      const response = await usuariosEndpoints.listar(params);
      setUsuarios(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [page, search]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    rolesEndpoints
      .listar()
      .then(setRoles)
      .catch(() => undefined);
  }, []);

  const handleBloquear = async (u: UserItem) => {
    try {
      await usuariosEndpoints.bloquear(u.id);
      setExito(`Usuario ${u.usuario} bloqueado; ya no puede iniciar sesión.`);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDesbloquear = async (u: UserItem) => {
    try {
      await usuariosEndpoints.desbloquear(u.id);
      setExito(`Usuario ${u.usuario} desbloqueado.`);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleEliminar = async (u: UserItem) => {
    try {
      await usuariosEndpoints.eliminar(u.id);
      setExito(`Usuario ${u.usuario} eliminado correctamente.`);
      setConfirmarEliminar(null);
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirmarEliminar(null);
    }
  };

  const textoCupo = (u: UserItem) => {
    if (u.roles.includes("SUPERADMIN")) return "Ilimitado";
    if (u.roles.includes("ADMIN")) return `${u.usuarios_creados ?? 0} / ${u.max_usuarios ?? 0}`;
    return "—";
  };

  return (
    <div className="usuarios-page">
      <PageHeader
        title="Gestión de Usuarios"
        subtitle="Administración de usuarios, cupos y bloqueos"
        icon={<Users size={24} />}
        actions={
          puedeCrear ? (
            <Button icon={<UserPlus size={18} />} onClick={() => setModal({ abierto: true, usuario: null })}>
              Nuevo Usuario
            </Button>
          ) : undefined
        }
      />

      {exito && (
        <Alert variant="success" onClose={() => setExito("")}>
          <CheckCircle size={20} />
          {exito}
        </Alert>
      )}

      <Card>
        <CardBody>
          <div className="usuarios-toolbar">
            <div className="usuarios-buscar">
              <Search size={18} className="usuarios-buscar-icon" />
              <input
                type="text"
                placeholder="Buscar por usuario, nombres o apellidos"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Badge variant="primary">
              {total} {total === 1 ? "usuario" : "usuarios"}
            </Badge>
          </div>

          {!esSuperAdmin && (
            <div className="usuarios-aviso">
              <Info size={16} />
              Solo puede crear usuarios OPERADOR o CONSULTA dentro de su cupo.
            </div>
          )}

          {error && (
            <Alert variant="error" className="usuarios-alert" onClose={() => setError("")}>
              <AlertCircle size={20} />
              {error}
            </Alert>
          )}

          {cargando ? (
            <div className="usuarios-cargando">
              <Loader2 size={26} className="spin" />
              <span>Cargando usuarios...</span>
            </div>
          ) : usuarios.length === 0 ? (
            <EmptyState
              icon={<Users size={40} />}
              title="Sin usuarios"
              description="No se encontraron usuarios con los criterios indicados."
            />
          ) : (
            <>
              <div className="usuarios-table-wrap">
                <table className="usuarios-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Nombres y Apellidos</th>
                      <th>Roles</th>
                      <th>Estado</th>
                      <th>Cupo (creados/máx)</th>
                      <th>Creado por</th>
                      <th>Creado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id}>
                        <td className="usuarios-usuario">{u.usuario}</td>
                        <td>
                          {u.nombres} {u.apellidos}
                        </td>
                        <td>
                          <div className="usuarios-roles">
                            {u.roles.length === 0 ? (
                              <span className="usuarios-sin-roles">Sin roles</span>
                            ) : (
                              u.roles.map((r) => (
                                <Badge key={r} variant={ROL_COLORS[r] || "gray"} size="sm">
                                  {r}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td>
                          <Badge variant={u.is_active ? "success" : "error"} size="sm">
                            {u.is_active ? "Activo" : "Bloqueado"}
                          </Badge>
                        </td>
                        <td className="usuarios-cupo">{textoCupo(u)}</td>
                        <td className="usuarios-mono">{u.usuario_creador || "—"}</td>
                        <td className="usuarios-mono">{new Date(u.created_at).toLocaleDateString("es-PE")}</td>
                        <td>
                          <div className="usuarios-acc">
                            {esGestor && (
                              <button
                                className="usuarios-btn-icon"
                                onClick={() => setModal({ abierto: true, usuario: u })}
                                title="Editar usuario"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {esGestor && !u.roles.includes("SUPERADMIN") && (
                              <button
                                className={`usuarios-btn-icon ${u.is_active ? "usuarios-btn-danger" : "usuarios-btn-ok"}`}
                                onClick={() => (u.is_active ? handleBloquear(u) : handleDesbloquear(u))}
                                title={u.is_active ? "Bloquear usuario" : "Desbloquear usuario"}
                              >
                                {u.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                              </button>
                            )}
                            {esSuperAdmin && !u.roles.includes("SUPERADMIN") && u.id !== user?.id && (
                              <button
                                className="usuarios-btn-icon usuarios-btn-danger"
                                onClick={() => setConfirmarEliminar(u)}
                                title="Eliminar usuario"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="usuarios-pagination">
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

      {/* Modal de confirmación de eliminación */}
      {confirmarEliminar && (
        <Modal
          isOpen
          onClose={() => setConfirmarEliminar(null)}
          title="Confirmar Eliminación"
          size="sm"
        >
          <div className="delete-confirmation">
            <div className="delete-warning">
              <AlertCircle size={48} className="text-error" />
              <h3>¿Está seguro?</h3>
              <p>
                Esta acción eliminará permanentemente al usuario{" "}
                <strong>{confirmarEliminar.usuario}</strong> ({confirmarEliminar.nombres} {confirmarEliminar.apellidos}).
              </p>
              <p className="delete-warning-text">
                Si el usuario tiene registros asociados (solicitudes creadas, auditorías, etc.), 
                la eliminación será bloqueada automáticamente.
              </p>
            </div>
            <div className="delete-actions">
              <Button
                variant="outline"
                onClick={() => setConfirmarEliminar(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 size={18} />}
                onClick={() => handleEliminar(confirmarEliminar)}
              >
                Eliminar Usuario
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modal.abierto && (
        <UserModal
          usuario={modal.usuario}
          roles={roles}
          esSuperAdmin={esSuperAdmin}
          esGestor={esGestor}
          usuarios={usuarios}
          selfId={user?.id ?? null}
          onClose={() => setModal({ abierto: false, usuario: null })}
          onGuardado={async () => {
            setModal({ abierto: false, usuario: null });
            setExito("Usuario guardado correctamente");
            await cargar();
          }}
        />
      )}
    </div>
  );
};

/* ===== Modal de usuario ===== */
interface UsuarioForm {
  usuario: string;
  password: string;
  nombres: string;
  apellidos: string;
  email: string;
  role_ids: number[];
  max_usuarios: string;
}

interface UserModalProps {
  usuario?: UserItem | null;
  roles: Role[];
  esSuperAdmin: boolean;
  esGestor: boolean;
  usuarios: UserItem[];
  selfId: number | null;
  onClose: () => void;
  onGuardado: () => Promise<void>;
}

const UserModal: React.FC<UserModalProps> = ({
  usuario,
  roles,
  esSuperAdmin,
  esGestor,
  usuarios,
  selfId,
  onClose,
  onGuardado,
}) => {
  const [error, setError] = useState("");
  const rolesPermitidos = esGestor
    ? roles.filter((r) => r.nombre !== "SUPERADMIN")
    : roles.filter((r) => r.nombre === "OPERADOR" || r.nombre === "CONSULTA");

  const adminRoleId = roles.find((r) => r.nombre === "ADMIN")?.id;
  const esEdicionAdmin = !!usuario?.roles.includes("ADMIN");

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<UsuarioForm>({
      defaultValues: {
        usuario: usuario?.usuario || "",
        password: "",
        nombres: usuario?.nombres || "",
        apellidos: usuario?.apellidos || "",
        email: usuario?.email || "",
        role_ids: usuario
          ? roles.filter((r) => usuario.roles.includes(r.nombre)).map((r) => r.id)
          : [],
        max_usuarios: usuario?.max_usuarios != null ? String(usuario.max_usuarios) : "",
      },
      mode: "onChange",
    });

  const role_ids = watch("role_ids");
  const crearAdminSeleccionado = !!adminRoleId && role_ids.includes(adminRoleId);

  const toggleRol = (id: number) => {
    const actual = watch("role_ids");
    if (actual.includes(id)) {
      setValue("role_ids", actual.filter((x) => x !== id));
    } else {
      setValue("role_ids", [...actual, id]);
    }
  };

  // Cupo restante del administrador que está creando (no superamin).
  let cupoInfo: string | null = null;
  if (!esGestor && selfId != null) {
    const yo = usuarios.find((u) => u.id === selfId);
    if (yo) cupoInfo = `Cupo disponible: ${(yo.usuarios_creados ?? 0)} / ${yo.max_usuarios ?? 0}`;
  }

  const onSubmit = async (values: UsuarioForm) => {
    setError("");
    try {
      if (usuario) {
        const payload: UserUpdatePayload = {
          nombres: values.nombres || null,
          apellidos: values.apellidos || null,
          email: values.email || null,
        };
        if (values.password) payload.password = values.password;
        if (esGestor && esEdicionAdmin) {
          payload.max_usuarios = values.max_usuarios !== "" ? Math.max(0, Number(values.max_usuarios) || 0) : null;
        }
        await usuariosEndpoints.editar(usuario.id, payload);
      } else {
        const payload: UserCreatePayload = {
          usuario: values.usuario,
          password: values.password,
          nombres: values.nombres || null,
          apellidos: values.apellidos || null,
          email: values.email || null,
          role_ids: values.role_ids,
        };
        if (esGestor && (crearAdminSeleccionado || values.role_ids.length === 0)) {
          payload.max_usuarios =
            values.max_usuarios !== "" ? Math.max(0, Number(values.max_usuarios) || 0) : null;
        }
        await usuariosEndpoints.crear(payload);
      }
      await onGuardado();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const inputCupo = (crearAdminSeleccionado || esEdicionAdmin) && esGestor;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={usuario ? `Editar Usuario: ${usuario.usuario}` : "Nuevo Usuario"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="user-form">
        {error && (
          <Alert variant="error" onClose={() => setError("")}>
            <AlertCircle size={20} />
            {error}
          </Alert>
        )}

        {cupoInfo && (
          <div className="user-cupo-info">
            <Info size={16} /> {cupoInfo}
          </div>
        )}

        <div className="user-form-grid">
          <div className="form-field">
            <label>Usuario *</label>
            <Input {...register("usuario", { required: "El usuario es requerido" })} placeholder="usuario" disabled={!!usuario} error={errors.usuario?.message} />
          </div>
          <div className="form-field">
            <label>{usuario ? "Nueva Contraseña (opcional)" : "Contraseña *"}</label>
            <Input
              type="password"
              {...register("password", {
                required: usuario ? false : "La contraseña es requerida",
                minLength: { value: 8, message: "Mínimo 8 caracteres" },
              })}
              placeholder="••••••"
              error={errors.password?.message}
            />
          </div>
          <div className="form-field">
            <label>Nombres</label>
            <Input {...register("nombres")} placeholder="Nombres" maxLength={100} />
          </div>
          <div className="form-field">
            <label>Apellidos</label>
            <Input {...register("apellidos")} placeholder="Apellidos" maxLength={100} />
          </div>
          <div className="form-field form-field-full">
            <label>Email</label>
            <Input
              type="email"
              {...register("email", { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email inválido" } })}
              placeholder="usuario@essalud.gob.pe"
              error={errors.email?.message}
            />
          </div>
        </div>

        {inputCupo && (
          <div className="user-cupo-field">
            <div className="user-roles-title">
              <Shield size={18} />
              <strong>Cupo del administrador</strong>
              <span className="user-admin-note">Solo el SUPERADMIN asigna el cupo</span>
            </div>
            <Input
              type="number"
              min={0}
              {...register("max_usuarios")}
              placeholder="Cantidad de usuarios que puede crear (0 = ninguno)"
            />
            <small className="user-cupo-hint">
              Este cupo aplica a los usuarios con rol ADMIN: no podrán crear más usuarios del indicado.
            </small>
          </div>
        )}

        <div className="user-roles-block">
          <div className="user-roles-title">
            <Shield size={18} />
            <strong>Roles</strong>
            {!esSuperAdmin && <span className="user-admin-note">Como administrador solo puede asignar OPERADOR o CONSULTA</span>}
          </div>
          <div className="user-roles-grid">
            {rolesPermitidos.map((r) => (
              <label key={r.id} className={`user-role-check ${role_ids.includes(r.id) ? "user-role-check-active" : ""}`}>
                <input
                  type="checkbox"
                  checked={role_ids.includes(r.id)}
                  onChange={() => toggleRol(r.id)}
                />
                <span>
                  <strong>{r.nombre}</strong>
                  <small>{r.descripcion || r.permissions.join(", ")}</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="user-form-footer">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting} icon={<UserPlus size={18} />}>
            {usuario ? "Guardar Cambios" : "Crear Usuario"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};