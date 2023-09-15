const ValueType = {
  NUMBER: 0,
  NUMBERS_1_12: 1,
  NUMBERS_2_12: 2,
  NUMBERS_3_12: 3,
  NUMBERS_1_18: 4,
  NUMBERS_19_36: 5,
  EVEN: 6,
  ODD: 7,
  RED: 8,
  BLACK: 9,
  DOUBLE_SPLIT: 10,
  QUAD_SPLIT: 11,
  TRIPLE_SPLIT: 12,
  EMPTY: 13,
  SIX_SPLIT: 14,
  NUMBERS_1R_12: 15,
  NUMBERS_2R_12: 16,
  NUMBERS_3R_12: 17,
};

const GameStages = {
  PLACE_BET: 0,
  NO_MORE_BETS: 1,
  WINNERS: 2,
  NONE: 3
};

exports.ValueType = ValueType;
exports.GameStages = GameStages;