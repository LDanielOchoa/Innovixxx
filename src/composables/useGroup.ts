import { ref } from 'vue'

interface Group {
  id: string
  nombre: string
}

const LONGITUD_ID_GRUPO = 8

const esIdGrupoValido = (id: unknown): id is string =>
  typeof id === 'string' && id.trim().length === LONGITUD_ID_GRUPO

const leerGrupoInicial = (): Group => {
  const grupoGuardado = localStorage.getItem('auth-grupo-obj')

  if (grupoGuardado) {
    try {
      const parseado = JSON.parse(grupoGuardado) as Partial<Group>
      const nombre = typeof parseado?.nombre === 'string' ? parseado.nombre : ''
      const id = esIdGrupoValido(parseado?.id) ? parseado.id.trim() : ''
      return { id, nombre }
    } catch {
      localStorage.removeItem('auth-grupo-obj')
    }
  }

  const idGuardado = localStorage.getItem('auth-grupo-id') || ''
  const nombreGuardado = localStorage.getItem('auth-grupo') || ''

  return {
    id: esIdGrupoValido(idGuardado) ? idGuardado.trim() : '',
    nombre: nombreGuardado
  }
}

const persistirGrupo = (group: Group) => {
  localStorage.setItem('auth-grupo-obj', JSON.stringify(group))
  localStorage.setItem('auth-grupo', group.nombre || '')

  if (group.id) {
    localStorage.setItem('auth-grupo-id', group.id)
  } else {
    localStorage.removeItem('auth-grupo-id')
  }
}

const initialGroup: Group = leerGrupoInicial()

const selectedGroup = ref<Group>(initialGroup)

export function useGroup() {
  const setGroup = (group: Group) => {
    const idActualValido = esIdGrupoValido(selectedGroup.value.id) ? selectedGroup.value.id.trim() : ''
    const idEntranteValido = esIdGrupoValido(group?.id) ? group.id.trim() : ''

    const grupoNormalizado: Group = {
      id: idEntranteValido || idActualValido,
      nombre: group?.nombre || selectedGroup.value.nombre || ''
    }

    selectedGroup.value = grupoNormalizado
    persistirGrupo(grupoNormalizado)
  }

  return {
    selectedGroup,
    setGroup
  }
}
