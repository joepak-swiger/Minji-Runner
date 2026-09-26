export const FOOD_EFFECTS = Object.freeze({
  INVULNERABILITY: 'invulnerability',
  SLOW: 'slow',
  SHIELD: 'shield',
  SPEED: 'speed',
});

export const FOOD_ITEMS = Object.freeze([
  Object.freeze({ name: 'Banana', row: 0, col: 0, category: 'fruit', effect: FOOD_EFFECTS.INVULNERABILITY }),
  Object.freeze({ name: 'Orange', row: 0, col: 1, category: 'fruit', effect: FOOD_EFFECTS.INVULNERABILITY }),
  Object.freeze({ name: 'Apple', row: 0, col: 2, category: 'fruit', effect: FOOD_EFFECTS.INVULNERABILITY }),
  Object.freeze({ name: 'Watermelon', row: 0, col: 3, category: 'fruit', effect: FOOD_EFFECTS.INVULNERABILITY }),
  Object.freeze({ name: 'Pineapple', row: 0, col: 4, category: 'fruit', effect: FOOD_EFFECTS.INVULNERABILITY }),

  Object.freeze({ name: 'Cherries', row: 1, col: 0, category: 'fruit', effect: FOOD_EFFECTS.INVULNERABILITY }),
  Object.freeze({ name: 'Donut', row: 1, col: 1, category: 'junk', effect: FOOD_EFFECTS.SLOW }),
  Object.freeze({ name: 'Ice Cream Cone', row: 1, col: 2, category: 'junk', effect: FOOD_EFFECTS.SLOW }),
  Object.freeze({ name: 'Egg', row: 1, col: 3, category: 'healthy', effect: FOOD_EFFECTS.SHIELD }),
  Object.freeze({ name: 'Cheese', row: 1, col: 4, category: 'healthy', effect: FOOD_EFFECTS.SHIELD }),

  Object.freeze({ name: 'Muffin', row: 2, col: 0, category: 'healthy', effect: FOOD_EFFECTS.SHIELD }),
  Object.freeze({ name: 'Bread', row: 2, col: 1, category: 'healthy', effect: FOOD_EFFECTS.SHIELD }),
  Object.freeze({ name: 'Coffee', row: 2, col: 2, category: 'coffee', effect: FOOD_EFFECTS.SPEED }),
  Object.freeze({ name: 'Hot Dog', row: 2, col: 3, category: 'junk', effect: FOOD_EFFECTS.SLOW }),
  Object.freeze({ name: 'Beer', row: 2, col: 4, category: 'junk', effect: FOOD_EFFECTS.SLOW }),

  Object.freeze({ name: 'Burger', row: 3, col: 0, category: 'junk', effect: FOOD_EFFECTS.SLOW }),
  Object.freeze({ name: 'Ice Cream Cup', row: 3, col: 1, category: 'junk', effect: FOOD_EFFECTS.SLOW }),
  Object.freeze({ name: 'Pizza', row: 3, col: 2, category: 'junk', effect: FOOD_EFFECTS.SLOW }),
  Object.freeze({ name: 'Carrot', row: 3, col: 3, category: 'healthy', effect: FOOD_EFFECTS.SHIELD }),
  Object.freeze({ name: 'Milk', row: 3, col: 4, category: 'healthy', effect: FOOD_EFFECTS.SHIELD }),

  Object.freeze({ name: 'French Fries', row: 4, col: 0, category: 'junk', effect: FOOD_EFFECTS.SLOW }),
  Object.freeze({ name: 'Fish', row: 4, col: 1, category: 'healthy', effect: FOOD_EFFECTS.SHIELD }),
  Object.freeze({ name: 'Avocado', row: 4, col: 2, category: 'healthy', effect: FOOD_EFFECTS.SHIELD }),
  Object.freeze({ name: 'Lollipop', row: 4, col: 3, category: 'junk', effect: FOOD_EFFECTS.SLOW }),
  Object.freeze({ name: 'Chocolate', row: 4, col: 4, category: 'junk', effect: FOOD_EFFECTS.SLOW }),
]);

const SHEET_COLUMNS = 5;
const SHEET_ROWS = 5;

export default class FoodPickup {
  constructor({
    container,
    groundHeight,
    getViewportWidth,
    itemIndex,
    size = 54,
    speedPx = 205,
    speedMultiplier = 1,
    spawnOffsetX = 44,
    y = 28,
    platform = null,
    platformOffsetX = null,
    platformLiftPx = 16,
  } = {}) {
    if (!container) throw new Error('FoodPickup: container is required.');
    if (typeof groundHeight !== 'number') throw new Error('FoodPickup: groundHeight is required.');
    if (typeof getViewportWidth !== 'function') throw new Error('FoodPickup: getViewportWidth is required.');

    this.container = container;
    this.groundHeight = groundHeight;
    this.getViewportWidth = getViewportWidth;
    this.size = size;
    this.w = size;
    this.h = size;
    this.itemIndex = normalizeItemIndex(itemIndex);
    this.item = FOOD_ITEMS[this.itemIndex];
    this.platform = platform;
    this.platformLiftPx = platformLiftPx;
    this.vx = -speedPx * speedMultiplier;
    this.collected = false;
    this._removed = false;

    if (platform) {
      const usableWidth = Math.max(0, platform.w - this.w);
      this.platformOffsetX = typeof platformOffsetX === 'number'
        ? platformOffsetX
        : Math.max(0, Math.min(usableWidth, platform.w * 0.58 - this.w * 0.5));
      this.x = platform.x + this.platformOffsetX;
      this.y = platform.worldTop() - this.groundHeight + this.platformLiftPx;
    } else {
      this.platformOffsetX = 0;
      this.x = this.getViewportWidth() + spawnOffsetX;
      this.y = Math.max(0, y);
    }

    this.el = document.createElement('div');
    this.el.className = 'food-pickup';
    this.el.dataset.foodIndex = String(this.itemIndex);
    this.el.dataset.foodName = this.item.name;
    this.el.dataset.foodCategory = this.item.category;
    this.el.dataset.foodEffect = this.item.effect;
    this.el.setAttribute?.(
      'aria-label',
      `${this.item.name}: ${foodEffectLabel(this.item.effect)} food pickup`,
    );
    this.el.style.width = `${this.w}px`;
    this.el.style.height = `${this.h}px`;
    applyFoodSpriteStyle(this.el, this.itemIndex, this.size);
    this.container.appendChild(this.el);
    this.place();
  }

  update(dt) {
    if (this._removed) return;

    if (this.platform && !this.platform._removed) {
      this.x = this.platform.x + this.platformOffsetX;
      this.y = this.platform.worldTop() - this.groundHeight + this.platformLiftPx;
    } else {
      this.platform = null;
      this.x += this.vx * dt;
    }

    this.place();
  }

  setGroundHeight(groundHeight) {
    if (typeof groundHeight !== 'number' || !Number.isFinite(groundHeight)) return;
    this.groundHeight = groundHeight;

    if (this.platform && !this.platform._removed) {
      this.y = this.platform.worldTop() - this.groundHeight + this.platformLiftPx;
    }

    this.place();
  }

  bounds() {
    const inset = Math.max(4, Math.round(this.size * 0.12));
    return {
      left: this.x + inset,
      right: this.x + this.w - inset,
      bottom: this.groundHeight + this.y + inset,
      top: this.groundHeight + this.y + this.h - inset,
    };
  }

  isOffscreenLeft() {
    return this.x + this.w < -36;
  }

  place() {
    this.el.style.left = `${this.x}px`;
    this.el.style.bottom = `${this.groundHeight + this.y}px`;
  }

  remove() {
    if (this._removed) return;
    this._removed = true;
    this.el.remove();
  }
}

export function applyFoodSpriteStyle(element, itemIndex, sizePx) {
  if (!element) return;

  const item = FOOD_ITEMS[normalizeItemIndex(itemIndex)];
  const renderedSheetWidth = sizePx * SHEET_COLUMNS;
  const renderedSheetHeight = sizePx * SHEET_ROWS;

  element.style.backgroundImage = 'url("assets/powerups/food.png")';
  element.style.backgroundRepeat = 'no-repeat';
  element.style.backgroundSize = `${renderedSheetWidth}px ${renderedSheetHeight}px`;
  element.style.backgroundPosition = `${-item.col * sizePx}px ${-item.row * sizePx}px`;
  element.style.imageRendering = 'pixelated';
}

export function foodEffectLabel(effect) {
  switch (effect) {
    case FOOD_EFFECTS.INVULNERABILITY:
      return 'invulnerability';
    case FOOD_EFFECTS.SLOW:
      return 'slowdown';
    case FOOD_EFFECTS.SHIELD:
      return 'one-hit shield';
    case FOOD_EFFECTS.SPEED:
      return 'speed boost';
    default:
      return 'mystery';
  }
}

function normalizeItemIndex(itemIndex) {
  if (Number.isInteger(itemIndex) && itemIndex >= 0 && itemIndex < FOOD_ITEMS.length) {
    return itemIndex;
  }
  return Math.floor(Math.random() * FOOD_ITEMS.length);
}
