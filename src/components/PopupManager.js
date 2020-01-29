import React from 'react';
import { connect } from 'react-redux';
import { arrayOf, bool, func, number, object, shape, string } from 'prop-types';

import {
  toggleAdd,
  toggleCategory,
  togglePlay,
  toggleBadge,
  toggleProgressBadge,
  togglePurchaseModal,
  toggleCategoryPurchase
} from '../actions/popup';

import CategoryPopup from './CategoryPopup';
import AddFriendPopup from './AddFriendPopup';
import Badge from './Badge';
import ProgressBadge from './ProgressBadge';
import NetworkErrorModal from './NetworkErrorModal';
import PurchaseModal from './PurchaseModal';
import CategoryPurchase from './CategoryPurchase';

const mapDispatchToProps = dispatch => ({
  closeAdd: () => dispatch(toggleAdd(false)),
  closeCategory: () =>
    dispatch(toggleCategory(false, { selectedCategory: null })),
  showPlay: data => dispatch(togglePlay(true, data)),
  closeBadge: () => dispatch(toggleBadge(false, '')),
  closeProgressBadge: () => dispatch(toggleProgressBadge(false)),
  closePurchaseModal: () => dispatch(togglePurchaseModal(false)),
  closeCategoryPurchase: () => dispatch(toggleCategoryPurchase(false)),
  openStore: () => dispatch(togglePurchaseModal(true))
});

const mapStateToProps = ({
  popup: {
    displayCategory,
    selectedCategory,
    transitionPosition,
    displayAdd,
    badge,
    displayProgressBadge,
    displayNetworkModal,
    displayPurchaseModal,
    categoryPurchaseData,
    displayCategoryPurchase
  },
  file: { videos }
}) => ({
  displayCategory,
  selectedCategory,
  transitionPosition,
  displayAdd,
  badge,
  videos,
  displayProgressBadge,
  displayNetworkModal,
  displayPurchaseModal,
  categoryPurchaseData,
  displayCategoryPurchase
});

const PopupManager = ({
  displayCategory,
  selectedCategory,
  transitionPosition,
  displayAdd,
  closeAdd,
  showPlay,
  closeCategory,
  badge,
  closeBadge,
  displayProgressBadge,
  closeProgressBadge,
  videos,
  displayNetworkModal,
  closePurchaseModal,
  displayPurchaseModal,
  categoryPurchaseData,
  displayCategoryPurchase,
  closeCategoryPurchase,
  openStore
}) => {
  const openPlay = _id => () => showPlay({ playCategory: _id });

  return (
    <>
      {displayAdd ? <AddFriendPopup close={closeAdd} /> : null}
      {displayCategory ? (
        <CategoryPopup
          close={closeCategory}
          play={openPlay(selectedCategory._id)}
          transitionPosition={transitionPosition}
          {...selectedCategory}
        />
      ) : null}
      {badge.display ? <Badge close={closeBadge} {...badge} /> : null}
      {displayProgressBadge ? (
        <ProgressBadge close={closeProgressBadge} videos={videos} />
      ) : null}
      {displayNetworkModal ? <NetworkErrorModal /> : null}
      {displayCategoryPurchase ? (
        <CategoryPurchase
          close={closeCategoryPurchase}
          category={categoryPurchaseData.category}
          user={categoryPurchaseData.user}
          openStore={openStore}
        />
      ) : null}
      {displayPurchaseModal ? (
        <PurchaseModal close={closePurchaseModal} />
      ) : null}
    </>
  );
};

PopupManager.propTypes = {
  displayCategory: bool.isRequired,
  selectedCategory: object,
  transitionPosition: object,
  displayAdd: bool.isRequired,
  closeAdd: func.isRequired,
  showPlay: func.isRequired,
  closeCategory: func.isRequired,
  closeBadge: func.isRequired,
  displayProgressBadge: bool.isRequired,
  closeProgressBadge: func.isRequired,
  displayNetworkModal: bool.isRequired,
  closePurchaseModal: func.isRequired,
  displayPurchaseModal: bool.isRequired,
  videos: object,
  badge: shape({
    display: bool,
    message: string,
    type: string
  }),
  categoryPurchaseData: shape({
    category: shape({
      _id: string,
      image: string,
      name: string,
      price: number
    }),
    user: shape({
      _id: string,
      categories: arrayOf(string),
      coins: number
    })
  }),
  displayCategoryPurchase: bool.isRequired,
  closeCategoryPurchase: func.isRequired,
  openStore: func.isRequired
};

PopupManager.defaultProps = {
  selectedCategory: null,
  transitionPosition: null,
  categoryPurchaseData: null,
  badge: {},
  videos: {}
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(PopupManager);
