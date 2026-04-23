import { reactive } from 'vue'
import { wardApi } from '@/api/ward'
import { agencyApi } from '@/api/agency'
import { stationApi } from '@/api/station'

const state = reactive({
  provinces: [],
  agencies: [],
  allStations: [],
  
  provincesLoading: false,
  agenciesLoading: false,
  stationsLoading: false,
  
  provincesLoaded: false,
  agenciesLoaded: false,
  stationsLoaded: false
})

export const metadataStore = {
  // Expose state as read-only properties or just the state object
  get provinces() { return state.provinces },
  get agencies() { return state.agencies },
  get allStations() { return state.allStations },
  get provincesLoading() { return state.provincesLoading },
  get agenciesLoading() { return state.agenciesLoading },
  get stationsLoading() { return state.stationsLoading },

  async fetchProvinces(force = false) {
    if (state.provincesLoaded && !force) return
    state.provincesLoading = true
    try {
      const res = await wardApi.getProvinces()
      state.provinces = res.data.data || []
      state.provincesLoaded = true
    } catch (error) {
      console.error('Fetch provinces failed:', error)
    } finally {
      state.provincesLoading = false
    }
  },

  async fetchAgencies(force = false) {
    if (state.agenciesLoaded && !force) return
    state.agenciesLoading = true
    try {
      const res = await agencyApi.getAgencies()
      state.agencies = res.data.data || []
      state.agenciesLoaded = true
    } catch (error) {
      console.error('Fetch agencies failed:', error)
    } finally {
      state.agenciesLoading = false
    }
  },

  async fetchAllStations(force = false) {
    if (state.stationsLoaded && !force) return
    state.stationsLoading = true
    try {
      const res = await stationApi.getStations()
      state.allStations = res.data.data || []
      state.stationsLoaded = true
    } catch (error) {
      console.error('Fetch stations failed:', error)
    } finally {
      state.stationsLoading = false
    }
  },

  clearCache() {
    state.provinces = []
    state.agencies = []
    state.allStations = []
    state.provincesLoaded = false
    state.agenciesLoaded = false
    state.stationsLoaded = false
  },

  // Getters
  getProvinceById(id) {
    return state.provinces.find(p => p.id === id)
  },
  getAgencyById(id) {
    return state.agencies.find(a => a.id === id)
  },
  getStationById(id) {
    return state.allStations.find(s => s.id === id)
  }
}

// Cung cấp export mặc định hoặc đặt tên để tương thích với các cách import khác nhau
export const useMetadataStore = () => metadataStore
