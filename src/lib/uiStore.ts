// Estado leve para vertical selecionada (id + nome) e gatilho de refresh.
import { useSyncExternalStore } from "react";

type State = {
  verticalId: string | null;
  verticalNome: string;
  refreshKey: number;
  noticiaId: string | null;
  menuAberto: boolean;
};

let state: State = {
  verticalId: "db8445c4-bb2a-4e65-b56a-f89639d528b6",
  verticalNome: "Nacional",
  refreshKey: 0,
  noticiaId: null,
  menuAberto: false,
};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setVertical(id: string, nome: string) {
  const same = state.verticalId === id;
  state = {
    ...state,
    verticalId: id,
    verticalNome: nome,
    refreshKey: same ? state.refreshKey : state.refreshKey + 1,
  };
  emit();
}
export function bumpRefresh() {
  state = { ...state, refreshKey: state.refreshKey + 1 };
  emit();
}
export function abrirNoticia(id: string) {
  state = { ...state, noticiaId: id };
  emit();
}
export function fecharNoticia() {
  if (state.noticiaId === null) return;
  state = { ...state, noticiaId: null };
  emit();
}
export function abrirMenu() {
  if (state.menuAberto) return;
  state = { ...state, menuAberto: true };
  emit();
}
export function fecharMenu() {
  if (!state.menuAberto) return;
  state = { ...state, menuAberto: false };
  emit();
}
export function getState() {
  return state;
}

export function useUI() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
    () => state,
  );
}
