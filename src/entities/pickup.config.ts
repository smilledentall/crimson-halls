/**
 * Constantes de balanceamento dos pickups.
 */
export const PICKUP_CONFIG = {
  healthAmount: 25,
  /** Munição concedida à arma atual ao coletar um pickup de munição. */
  ammoAmount: 4,
  /** Núcleos concedidos ao coletar um pickup de moeda. */
  currencyAmount: 5,
  /** Distância (horizontal) para coletar. */
  collectRadius: 1.4,
} as const
