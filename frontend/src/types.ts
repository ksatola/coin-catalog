export type CoinImageKind = 'avers' | 'rewers' | 'additional'

export interface CoinImage {
  id: number
  coin_id: number
  filename: string
  kind: CoinImageKind
  sort_order: number
  created_at: string
}

export interface Category {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface CategoryGraphItem extends Category {
  parent_ids: number[]
  child_ids: number[]
}

export interface CoinFormSubmit {
  coin: CoinCreate
  images: {
    avers: File | null
    rewers: File | null
    additional: File[]
    additionalDeletes: CoinImage[]
  }
}

export interface CoinCreate {
  country_id: number
  issuer_id: number | null
  denomination_id: number
  from_year: number
  from_era_id: number
  to_year: number
  to_era_id: number
  mint_id: number | null
  material_id: number | null
  state_id: number | null
  description: string | null
  weight: number | null
  diameter: number | null
  has_video: boolean
  source: string | null
}

export interface Coin extends CoinCreate {
  id: number
  is_deleted: boolean
  created_at: string
  updated_at: string
}
