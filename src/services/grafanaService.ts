/* eslint-disable @typescript-eslint/naming-convention */
import axios, { type AxiosResponse } from "axios";

const GRAFANA_HOST      = "https://fantasydraft2425.grafana.net";
const DASHBOARD_UID     = "218ff786-0826-4307-a35c-8352baeae445";
const USER_DASHBOARD_UID= "4e110723-fcea-4282-9156-81dd0e2b17ff";
const PANEL_ID          = 1;
const DEFAULT_WIDTH     = 800;
const DEFAULT_HEIGHT    = 300;
const DEFAULT_THEME     = "light";

const token = process.env.GRAFANA_TOKEN;
if (!token) {
  throw new Error("GRAFANA_TOKEN no está definido en el .env");
}

/**
 * Hace fetch al endpoint de renderizado de Grafana para el historial de un jugador
 * y retorna el Stream de la imagen PNG.
 * @param playerId  ID del jugador
 * @param theme     "light" | "dark"
 */
export async function fetchGrafanaImage(
  playerId: string | number,
  theme: string = DEFAULT_THEME
): Promise<AxiosResponse<unknown, undefined>> {
  const url =
    `${GRAFANA_HOST}/render/d-solo/${DASHBOARD_UID}/playerhistory` +
    `?panelId=${PANEL_ID}` +
    `&width=${DEFAULT_WIDTH}` +
    `&height=${DEFAULT_HEIGHT}` +
    `&theme=${encodeURIComponent(theme)}` +
    `&var-jugador_id=${encodeURIComponent(playerId)}`;

  return axios.get(url, {
    responseType: "stream",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

/**
 * Hace fetch al endpoint de renderizado de Grafana para el histórico de usuario en una liga
 * y retorna el Stream de la imagen PNG.
 * @param ligaId     ID de la liga
 * @param usuarioId  ID del usuario
 * @param theme      "light" | "dark"
 */
export async function fetchGrafanaImageUser(
  ligaId: string | number,
  usuarioId: string | number,
  theme: string = DEFAULT_THEME
): Promise<AxiosResponse<unknown, undefined>> {
  const url =
    `${GRAFANA_HOST}/render/d-solo/${USER_DASHBOARD_UID}/new-dashboard` +
    `?orgId=1` +
    `&panelId=${PANEL_ID}` +
    `&width=${DEFAULT_WIDTH}` +
    `&height=${DEFAULT_HEIGHT}` +
    `&theme=${encodeURIComponent(theme)}` +
    `&var-liga_id=${encodeURIComponent(ligaId)}` +
    `&var-usuario_id=${encodeURIComponent(usuarioId)}`;

  return axios.get(url, {
    responseType: "stream",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
