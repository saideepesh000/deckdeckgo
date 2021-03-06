import {Component, Element, Event, EventEmitter, h, JSX, Prop} from '@stencil/core';
import {modalController, OverlayEventDetail, popoverController} from '@ionic/core';

import {ConnectionState, DeckdeckgoEventDeckRequest} from '@deckdeckgo/types';

import offlineStore from '../../../../../stores/offline.store';
import remoteStore from '../../../../../stores/remote.store';
import deckStore from '../../../../../stores/deck.store';
import userStore from '../../../../../stores/user.store';
import shareStore from '../../../../../stores/share.store';
import errorStore from '../../../../../stores/error.store';

import {MoreAction} from '../../../../../types/editor/more-action';

import {BackupOfflineService} from '../../../../../services/editor/backup/backup.offline.service';

@Component({
  tag: 'app-actions-deck',
  shadow: false,
})
export class AppActionsDeck {
  @Element() el: HTMLElement;

  @Prop()
  fullscreen: boolean = false;

  @Prop()
  slides: JSX.IntrinsicElements[] = [];

  @Prop()
  blockSlide: EventEmitter;

  @Prop()
  signIn: EventEmitter;

  @Prop()
  addSlide: EventEmitter;

  @Prop()
  animatePrevNextSlide: EventEmitter;

  @Prop()
  slideTo: EventEmitter;

  @Prop()
  toggleFullScreen: EventEmitter;

  @Prop()
  actionPublish: EventEmitter;

  @Prop()
  deckDidChange: EventEmitter;

  @Event()
  private selectDeck: EventEmitter<void>;

  private destroyListener;

  async componentWillLoad() {
    this.destroyListener = remoteStore.onChange('pendingRequests', async (requests: DeckdeckgoEventDeckRequest[] | undefined) => {
      if (requests && requests.length > 0) {
        await this.openRemoteControlRequest();
      }

      this.destroyListener();
    });
  }

  disconnectedCallback() {
    if (this.destroyListener) {
      this.destroyListener();
    }
  }

  private async openSlideNavigate() {
    const modal: HTMLIonModalElement = await modalController.create({
      component: 'app-slide-navigate',
    });

    modal.onDidDismiss().then(async (detail: OverlayEventDetail) => {
      if (detail.data >= 0) {
        this.slideTo.emit(detail.data);
      }
    });

    await modal.present();
  }

  private async openRemoteControlRequest() {
    const popover: HTMLIonPopoverElement = await popoverController.create({
      component: 'app-remote-request',
      mode: 'ios',
      cssClass: 'info',
    });

    await popover.present();
  }

  private async openRemoteControlConnect() {
    const modal: HTMLIonModalElement = await modalController.create({
      component: 'app-remote-connect',
    });

    await modal.present();
  }

  private async openEmbed() {
    const modal: HTMLIonModalElement = await modalController.create({
      component: 'app-embed',
    });

    await modal.present();
  }

  private async openMoreActions($event: UIEvent) {
    if (!$event) {
      return;
    }

    const popover: HTMLIonPopoverElement = await popoverController.create({
      component: 'app-more-deck-actions',
      componentProps: {
        offline: offlineStore.state.offline,
      },
      event: $event,
      mode: 'ios',
    });

    popover.onDidDismiss().then(async (detail: OverlayEventDetail) => {
      if (detail && detail.data) {
        if (detail.data.action === MoreAction.PRESENT) {
          await this.openPresent($event);
        } else if (detail.data.action === MoreAction.JUMP_TO) {
          await this.openSlideNavigate();
        } else if (detail.data.action === MoreAction.SHARE) {
          shareStore.state.share = {
            deck: deckStore.state.deck,
            userName: userStore.state.name,
            userSocial: userStore.state.social,
          };
        } else if (detail.data.action === MoreAction.PUBLISH) {
          this.actionPublish.emit();
        } else if (detail.data.action === MoreAction.EMBED) {
          await this.openEmbed();
        } else if (detail.data.action === MoreAction.OFFLINE) {
          await this.goOnlineOffline();
        } else if (detail.data.action === MoreAction.BACKUP) {
          await this.backupOfflineData();
        }
      }
    });

    await popover.present();
  }

  private async toggleFullScreenMode() {
    this.toggleFullScreen.emit();
  }

  async openDeckStyle() {
    this.selectDeck.emit();

    const popover: HTMLIonPopoverElement = await popoverController.create({
      component: 'app-deck-style',
      componentProps: {
        signIn: this.signIn,
        blockSlide: this.blockSlide,
        deckDidChange: this.deckDidChange,
      },
      mode: 'md',
      showBackdrop: false,
      cssClass: 'popover-menu popover-menu-wide',
    });

    await popover.present();
  }

  private async goOnlineOffline() {
    const modal: HTMLIonModalElement = await modalController.create({
      component: 'app-offline',
      componentProps: {
        offline: offlineStore.state.offline,
      },
      cssClass: 'fullscreen',
    });

    await modal.present();
  }

  private async openRemote() {
    const connected: boolean =
      remoteStore.state.connectionState !== ConnectionState.DISCONNECTED && remoteStore.state.connectionState !== ConnectionState.NOT_CONNECTED;

    if (connected && remoteStore.state.pendingRequests && remoteStore.state.pendingRequests.length > 0) {
      await this.closeRemote();
      await this.openRemoteControlRequest();
    } else {
      await this.openRemoteControlConnect();
    }
  }

  private async openPresent($event: UIEvent) {
    const popover: HTMLIonPopoverElement = await popoverController.create({
      component: 'app-present',
      componentProps: {
        fullscreen: this.fullscreen,
      },
      event: $event,
      mode: 'ios',
      cssClass: 'info',
    });

    popover.onDidDismiss().then(async (detail: OverlayEventDetail) => {
      if (detail?.data.action === MoreAction.REMOTE) {
        await this.openRemote();
      }
    });

    await popover.present();
  }

  private async closeRemote() {
    if (!document) {
      return;
    }

    const popover: HTMLIonPopoverElement = document.querySelector('ion-popover');

    if (popover) {
      await popover.dismiss();
    }
  }

  private async backupOfflineData() {
    try {
      await BackupOfflineService.getInstance().backup();
    } catch (err) {
      errorStore.state.error = `Something went wrong. ${err}.`;
    }
  }

  render() {
    return (
      <ion-toolbar>
        <ion-buttons slot="start">
          <app-action-add-slide slides={this.slides} blockSlide={this.blockSlide} signIn={this.signIn} addSlide={this.addSlide}></app-action-add-slide>

          <button
            onMouseDown={($event) => $event.stopPropagation()}
            onTouchStart={($event) => $event.stopPropagation()}
            aria-label="Previous"
            onClick={() => this.animatePrevNextSlide.emit(false)}
            class="ion-activatable">
            <ion-ripple-effect></ion-ripple-effect>
            <ion-icon aria-hidden="true" src="/assets/icons/ionicons/arrow-back.svg"></ion-icon>
            <ion-label aria-hidden="true">Previous</ion-label>
          </button>

          <button
            onMouseDown={($event) => $event.stopPropagation()}
            onTouchStart={($event) => $event.stopPropagation()}
            aria-label="Next"
            onClick={() => this.animatePrevNextSlide.emit(true)}
            class="ion-activatable">
            <ion-ripple-effect></ion-ripple-effect>
            <ion-icon aria-hidden="true" src="/assets/icons/ionicons/arrow-forward.svg"></ion-icon>
            <ion-label aria-hidden="true">Next</ion-label>
          </button>

          <button
            onMouseDown={($event) => $event.stopPropagation()}
            onTouchStart={($event) => $event.stopPropagation()}
            aria-label="Slides"
            onClick={() => this.openSlideNavigate()}
            color="primary"
            class="ion-activatable wider-devices">
            <ion-ripple-effect></ion-ripple-effect>
            <ion-icon aria-hidden="true" src="/assets/icons/ionicons/md-list.svg"></ion-icon>
            <ion-label aria-hidden="true">Slides</ion-label>
          </button>

          <app-action-busy aria-label="Style" iconSrc="/assets/icons/ionicons/brush.svg" onActionReady={() => this.openDeckStyle()}>
            <ion-label aria-hidden="true">Style</ion-label>
          </app-action-busy>
        </ion-buttons>

        <ion-buttons slot="end">
          {this.renderExitFullscreenButton()}

          <button
            onMouseDown={($event) => $event.stopPropagation()}
            onTouchStart={($event) => $event.stopPropagation()}
            aria-label="Remote"
            onClick={($event: UIEvent) => this.openPresent($event)}
            color="primary"
            class="wider-devices open-remote ion-activatable">
            <ion-ripple-effect></ion-ripple-effect>
            <ion-icon aria-hidden="true" src="/assets/icons/ionicons/play.svg"></ion-icon>
            <ion-label aria-hidden="true">Present</ion-label>
          </button>

          <app-action-share class="wider-devices" onOpenEmbed={() => this.openEmbed()}></app-action-share>

          <button
            onMouseDown={($event) => $event.stopPropagation()}
            onTouchStart={($event) => $event.stopPropagation()}
            aria-label={offlineStore.state.offline ? 'Go online' : 'Go offline'}
            onClick={() => this.goOnlineOffline()}
            color="primary"
            class="wider-devices ion-activatable">
            <ion-ripple-effect></ion-ripple-effect>
            <ion-icon aria-hidden="true" src={`/assets/icons/ionicons/${offlineStore.state.offline ? 'cloud-done' : 'cloud-offline'}.svg`}></ion-icon>
            {offlineStore.state.offline ? <ion-label aria-hidden="true">Go online</ion-label> : <ion-label aria-hidden="true">Go offline</ion-label>}
          </button>

          {this.renderBackup()}

          <app-action-help class="wider-devices"></app-action-help>

          <button
            onMouseDown={($event) => $event.stopPropagation()}
            onTouchStart={($event) => $event.stopPropagation()}
            onClick={(e: UIEvent) => this.openMoreActions(e)}
            color="primary"
            class="small-devices ion-activatable">
            <ion-ripple-effect></ion-ripple-effect>
            <ion-icon aria-hidden="true" src="/assets/icons/ionicons/ellipsis-vertical.svg"></ion-icon>
            <ion-label aria-hidden="true">More</ion-label>
          </button>
        </ion-buttons>
      </ion-toolbar>
    );
  }

  private renderExitFullscreenButton() {
    if (!this.fullscreen) {
      return undefined;
    }

    return (
      <button
        onMouseDown={($event) => $event.stopPropagation()}
        onTouchStart={($event) => $event.stopPropagation()}
        onClick={() => this.toggleFullScreenMode()}
        color="primary"
        class="wider-devices ion-activatable">
        <ion-ripple-effect></ion-ripple-effect>
        <ion-icon aria-hidden="true" src="/assets/icons/ionicons/contract.svg"></ion-icon> <ion-label aria-hidden="true">Exit fullscreen</ion-label>
      </button>
    );
  }

  private renderBackup() {
    if (!offlineStore.state.offline) {
      return undefined;
    }

    return (
      <button
        onMouseDown={($event) => $event.stopPropagation()}
        onTouchStart={($event) => $event.stopPropagation()}
        aria-label="Backup"
        onClick={() => this.backupOfflineData()}
        color="primary"
        class="wider-devices ion-activatable">
        <ion-ripple-effect></ion-ripple-effect>
        <ion-icon aria-hidden="true" src="/assets/icons/ionicons/download.svg"></ion-icon> <ion-label aria-hidden="true">Backup</ion-label>
      </button>
    );
  }
}
