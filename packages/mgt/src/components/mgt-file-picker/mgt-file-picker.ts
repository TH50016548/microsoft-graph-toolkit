import { MgtTemplatedComponent, Providers, ProviderState } from '@microsoft/mgt-element';
import { customElement, html, property, TemplateResult } from 'lit-element';
import { getSvg, SvgIcon } from '../../utils/SvgHelper';
import { MgtFlyout } from '../sub-components/mgt-flyout/mgt-flyout';
import { getMyInsights, InsightsItem } from './graph.files';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { styles } from './mgt-file-picker-css';
import { getRelativeDisplayDate } from '../../utils/Utils';
import '../sub-components/mgt-spinner/mgt-spinner';

const strings = {
  buttonLabel: 'Pick from OneDrive',
  itemModifiedFormat: 'Modified {0}',
  itemAccessedFormat: 'Accessed {0}',
  seeAllItems: 'See all files',
  resultsTitle: 'Recent files'
};

const formatString = function(format: string, ...values: string[]): string {
  values.forEach((v, i) => (format = format.replace(`{${i}}`, v)));
  return format;
};

const isSignedIn = () => Providers.globalProvider && Providers.globalProvider.state === ProviderState.SignedIn;

/**
 * foo
 *
 * @export
 * @class MgtFilePicker
 * @extends {MgtTemplatedComponent}
 */
@customElement('mgt-file-picker')
export class MgtFilePicker extends MgtTemplatedComponent {
  /**
   * Array of styles to apply to the element. The styles should be defined
   * using the `css` tag function.
   */
  static get styles() {
    return styles;
  }

  /**
   * The items array rendered by the control.
   *
   * @readonly
   * @memberof MgtFilePicker
   */
  public get items() {
    return this._items;
  }

  private _items: InsightsItem[];
  private _doLoad: boolean;

  /**
   * Gets the flyout element
   *
   * @protected
   * @type {MgtFlyout}
   * @memberof MgtPerson
   */
  protected get flyout(): MgtFlyout {
    return this.renderRoot.querySelector('.flyout');
  }

  constructor() {
    super();

    this._items = null;
    this._doLoad = false;
  }

  /**
   * Render the component
   *
   * @returns
   * @memberof MgtFilePicker
   */
  render() {
    const root = html`
      <div class="root">${this.renderButton()}</div>
    `;

    const flyoutContent = html`
      <div slot="flyout">${this.renderFlyoutContent()}</div>
    `;

    const flyoutClasses = classMap({
      flyout: true,
      disabled: !isSignedIn(),
      loading: this.isLoadingState
    });

    return html`
      <mgt-flyout class=${flyoutClasses}>
        ${root} ${flyoutContent}
      </mgt-flyout>
    `;
  }

  /**
   * Render the button used to invoke the flyout
   *
   * @protected
   * @returns {TemplateResult}
   * @memberof MgtFilePicker
   */
  protected renderButton(): TemplateResult {
    return html`
      <div class="button" @click=${() => this.toggleFlyout()}>
        <div class="button__text">${strings.buttonLabel}</div>
        <div class="button__icon">${getSvg(SvgIcon.ExpandDown)}</div>
      </div>
    `;
  }

  /**
   * Render the contents of the flyout, visible when open
   *
   * @protected
   * @returns {TemplateResult}
   * @memberof MgtFilePicker
   */
  protected renderFlyoutContent(): TemplateResult {
    let contentTemplate = this.isLoadingState
      ? this.renderLoading()
      : html`
          <div class="header">
            <div class="header__title">${strings.resultsTitle}</div>
            <div class="header__all-items" @click=${e => this.handleAllFilesClick(e)}>
              ${strings.seeAllItems}
            </div>
          </div>
          <div class="items">
            ${repeat(this._items || [], i => i.id, i => this.renderItem(i))}
          </div>
        `;

    return html`
      <div class="flyout-root">
        ${contentTemplate}
      </div>
    `;
  }

  /**
   * Render the loading state of the results flyout
   *
   * @protected
   * @returns {TemplateResult}
   * @memberof MgtFilePicker
   */
  protected renderLoading(): TemplateResult {
    return html`
      <div class="spinner">
        <mgt-spinner></mgt-spinner>
      </div>
    `;
  }

  protected renderItem(item: InsightsItem): TemplateResult {
    let lastUsedTemplate: TemplateResult = null;
    const lastUsed = item.lastUsed;
    if (lastUsed && (lastUsed.lastModifiedDateTime || lastUsed.lastAccessedDateTime)) {
      let lastUsedDate: Date;
      let lastUsedStringFormat: string;

      if (item.lastUsed.lastModifiedDateTime) {
        lastUsedDate = new Date(item.lastUsed.lastModifiedDateTime);
        lastUsedStringFormat = strings.itemModifiedFormat;
      } else if (item.lastUsed.lastAccessedDateTime) {
        lastUsedDate = new Date(item.lastUsed.lastAccessedDateTime);
        lastUsedStringFormat = strings.itemAccessedFormat;
      }

      const relativeDateString = getRelativeDisplayDate(lastUsedDate);
      const lastUsedString = formatString(lastUsedStringFormat, relativeDateString);

      lastUsedTemplate = html`
        <div class="item__last-used">
          ${lastUsedString}
        </div>
      `;
    }

    return html`
      <div
        class="item"
        @click=${e => this.handleItemClick(item, e)}
        @mouseenter=${e => this.handleItemMouseEnter(item, e)}
      >
        <div class="item__icon">
          ${getSvg(SvgIcon.File)}
        </div>
        <div class="item__details">
          <div class="item__title">
            ${item.resourceVisualization.title}
          </div>
          ${lastUsedTemplate}
        </div>
      </div>
    `;
  }

  /**
   * Toggle the flyout visiblity
   *
   * @protected
   * @memberof MgtFilePicker
   */
  protected toggleFlyout(): void {
    if (!isSignedIn()) {
      return;
    }

    if (this.flyout.isOpen) {
      this.flyout.close();
    } else {
      // Lazy load
      if (!this._doLoad) {
        this._doLoad = true;
        this.requestStateUpdate();
      }

      this.flyout.open();
    }
  }

  /**
   * Handle the click event on an item.
   *
   * @protected
   * @param {InsightsItem} item
   * @memberof MgtFilePicker
   */
  protected handleItemClick(item: InsightsItem, event: PointerEvent): void {
    window.open(item.resourceReference.webUrl, '_blank');
  }

  protected handleItemMouseEnter(item: InsightsItem, event: PointerEvent): void {}

  protected handleAllFilesClick(e: PointerEvent): void {
    this.openFullPicker();
  }

  protected openFullPicker(): void {
    console.log('Full picker.');
  }

  /**
   * Load the state of the control.
   *
   * @protected
   * @returns
   * @memberof MgtFilePicker
   */
  protected async loadState() {
    // Check if signed in
    if (!isSignedIn()) {
      return;
    }

    // Don't load by default.
    // Wait for the flyout to be opened first.
    if (!this._doLoad) {
      return;
    }

    // Artificial loading time
    //const delay = ms => new Promise(c => setTimeout(c, ms));
    //await delay(1000 * 5);

    const graph = Providers.globalProvider.graph;
    this._items = await getMyInsights(graph);
  }
}
