/**
 * External dependencies
 */
import { registerStore } from '@wordpress/data';
import { controls } from '@wordpress/data-controls';
import { SelectFromMap, DispatchFromMap } from '@automattic/data-stores';

/**
 * Internal dependencies
 */
import * as actions from './actions';
import * as resolvers from './resolvers';
import * as selectors from './selectors';
import reducer from './reducer';
import { STORE_KEY } from './constants';
import { WPDataActions, WPDataSelectors } from '../types';
import { PromiseifySelectors } from '../types/promiseify-selectors';

export const PAYMENT_SETTINGS_STORE_NAME = STORE_KEY;

registerStore( STORE_KEY, {
	actions,
	selectors,
	resolvers,
	controls,
	reducer,
} );

declare module '@wordpress/data' {
	function dispatch(
		key: typeof STORE_KEY
	): DispatchFromMap< typeof actions & WPDataActions >;

	function select(
		key: typeof STORE_KEY
	): SelectFromMap< typeof selectors > & WPDataSelectors;

	function resolveSelect(
		key: typeof STORE_KEY
	): PromiseifySelectors< SelectFromMap< typeof selectors > >;
}
