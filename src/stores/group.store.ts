import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Group {
  id: string
  nombre: string
  logo?: string
}

const LONGITUD_ID_GRUPO = 8

export const esIdGrupoValido = (id: unknown): id is string =>
  typeof id === 'string' && id.trim().length === LONGITUD_ID_GRUPO

export const useGroupStore = defineStore('group', () => {
  const selectedGroup = ref<Group>({ id: '', nombre: '' })

  const setGroup = (group: Group) => {
    const idActualValido = esIdGrupoValido(selectedGroup.value.id) ? selectedGroup.value.id.trim() : ''
    const idEntranteValido = esIdGrupoValido(group?.id) ? group.id.trim() : ''

    selectedGroup.value = {
      id: idEntranteValido || idActualValido,
      nombre: group?.nombre || selectedGroup.value.nombre || '',
      logo: group?.logo !== undefined ? group.logo : selectedGroup.value.logo
    }
  }

  return { selectedGroup, setGroup }
}, {
  persist: {
    key: 'auth-grupo-obj',
    storage: localStorage
  }
})
