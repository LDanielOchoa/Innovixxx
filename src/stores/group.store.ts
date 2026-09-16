import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Group {
  id: string
  nombre: string
  logo?: string
}

export const ID_GRUPO_MAIN = 'MWDomp21'
const LONGITUD_ID_GRUPO = 8

export const esIdGrupoValido = (id: unknown): id is string =>
  typeof id === 'string' && id.trim().length > 0

export const useGroupStore = defineStore('group', () => {
  const selectedGroup = ref<Group>({ id: '', nombre: '' })

  // Determina si el grupo actualmente seleccionado es el grupo principal
  const esGrupoMain = computed(() => {
    return selectedGroup.value.id === ID_GRUPO_MAIN
  })

  const setGroup = (group: Group) => {
    const idActualValido = esIdGrupoValido(selectedGroup.value.id) ? selectedGroup.value.id.trim() : ''
    const idEntranteValido = esIdGrupoValido(group?.id) ? group.id.trim() : ''

    const nuevoId = idEntranteValido || idActualValido
    const nuevoNombre = group?.nombre || selectedGroup.value.nombre || ''
    const nuevoLogo = group?.logo !== undefined ? group.logo : selectedGroup.value.logo

    selectedGroup.value = {
      id: nuevoId,
      nombre: nuevoNombre,
      logo: nuevoLogo
    }

    if (nuevoId) {
      localStorage.setItem('auth-grupo-id', nuevoId)
    }
    if (nuevoNombre) {
      localStorage.setItem('auth-grupo', nuevoNombre)
    }
  }

  return { selectedGroup, esGrupoMain, setGroup }
}, {
  persist: {
    key: 'auth-grupo-obj',
    storage: localStorage
  }
})

