/**
 * External dependencies
 */
import {
	insertBlockByShortcut,
	goToPageEditor,
	publishPage,
	addAProductToCart,
	getOrderIdFromUrl,
	fillShippingCheckoutBlocks,
	fillBillingCheckoutBlocks,
} from '@woocommerce/e2e-utils-playwright';
import { request } from '@playwright/test';

/**
 * Internal dependencies
 */
import { ADMIN_STATE_PATH } from '../../playwright.config';
import { fillPageTitle } from '../../utils/editor';
import { expect, tags, test as baseTest } from '../../fixtures/fixtures';
import { admin, customer } from '../../test-data/data';
import { logIn } from '../../utils/login';
import { clearFilters, setFilterValue } from '../../utils/filters';
import { setOption } from '../../utils/options';

const guestEmail = 'checkout-guest@example.com';
const newAccountEmail = `marge-${ new Date()
	.getTime()
	.toString() }@woocommercecoree2etestsuite.com`;
const newAccountEmailWithCustomPassword = `homer-${ new Date()
	.getTime()
	.toString() }@woocommercecoree2etestsuite.com`;
const newAccountCustomPassword = 'sup3rS3cur3P4ssw0rd!#123';

const simpleProductName = 'Very Simple Product';
const simpleProductDesc = 'Lorem ipsum dolor.';
const singleProductFullPrice = '150.00';
const singleProductSalePrice = '75.00';
const twoProductPrice = ( singleProductSalePrice * 2 ).toString();
const threeProductPrice = ( singleProductSalePrice * 3 ).toString();

let guestOrderId1,
	guestOrderId2,
	customerOrderId,
	newAccountOrderId,
	productId,
	shippingZoneId;

const shippingDetails = {
	firstName: 'Homer',
	lastName: 'Simpson',
	address: '123 Evergreen Terrace',
	zip: '97403',
	city: 'Springfield',
	state: 'OR',
	country: 'US',
};

const billingDetails = {
	firstName: 'Mister',
	lastName: 'Burns',
	address: '156th Street',
	zip: '98500',
	city: 'Springfield',
	state: 'WA',
	country: 'US',
};

const test = baseTest.extend( {
	storageState: ADMIN_STATE_PATH,
	testPageTitlePrefix: 'Checkout Block',
	page: async ( { context, page, testPage }, use ) => {
		await goToPageEditor( { page } );
		await fillPageTitle( page, testPage.title );
		await insertBlockByShortcut( page, 'Checkout' );
		await publishPage( page, testPage.title );

		await context.clearCookies();

		await use( page );
	},
} );

test.describe(
	'Checkout Block page',
	{ tag: [ tags.PAYMENTS, tags.SERVICES, tags.HPOS ] },
	() => {
		test.beforeAll( async ( { baseURL, api } ) => {
			await test.step( 'Set field visibility options', async () => {
				await setOption(
					request,
					baseURL,
					'woocommerce_checkout_phone_field',
					'optional'
				);
				await setOption(
					request,
					baseURL,
					'woocommerce_checkout_company_field',
					'optional'
				);
				await setOption(
					request,
					baseURL,
					'woocommerce_checkout_address_2_field',
					'optional'
				);
			} );

			await test.step( 'Make sure the currency is USD', async () => {
				await api.put( 'settings/general/woocommerce_currency', {
					value: 'USD',
				} );
			} );

			await test.step( 'Add test product.', async () => {
				await api
					.post( 'products', {
						name: simpleProductName,
						description: simpleProductDesc,
						type: 'simple',
						regular_price: singleProductFullPrice,
						sale_price: singleProductSalePrice,
					} )
					.then( ( response ) => {
						productId = response.data.id;
					} );
			} );

			await test.step( 'Enable logging through checkout', async () => {
				await api.put(
					'settings/account/woocommerce_enable_checkout_login_reminder',
					{
						value: 'yes',
					}
				);
			} );

			await test.step( 'Enable creating account through checkout', async () => {
				await api.put(
					'settings/account/woocommerce_enable_signup_and_login_from_checkout',
					{
						value: 'yes',
					}
				);
			} );

			await test.step( 'Add a shipping zone and method', async () => {
				await api
					.post( 'shipping/zones', {
						name: 'California and Oregon Shipping Zone',
					} )
					.then( ( response ) => {
						shippingZoneId = response.data.id;
					} );
				await api.put( `shipping/zones/${ shippingZoneId }/locations`, [
					{
						code: 'US:CA',
						type: 'state',
					},
					{
						code: 'US:OR',
						type: 'state',
					},
				] );
				await api.post( `shipping/zones/${ shippingZoneId }/methods`, {
					method_id: 'free_shipping',
					settings: {
						title: 'Free shipping',
					},
				} );
				await api.post( `shipping/zones/${ shippingZoneId }/methods`, {
					method_id: 'local_pickup',
					settings: {
						title: 'Local pickup',
					},
				} );
				await api.post( `shipping/zones/${ shippingZoneId }/methods`, {
					method_id: 'flat_rate',
					settings: {
						title: 'Flat rate',
						cost: singleProductSalePrice,
					},
				} );
			} );

			await test.step( 'Enable bank transfers and COD for payment', async () => {
				await api.put( 'payment_gateways/bacs', {
					enabled: true,
				} );
				await api.put( 'payment_gateways/cod', {
					enabled: true,
				} );
			} );

			await test.step( 'Make sure our customer user has a pre-defined billing/shipping address', async () => {
				// Get existing customer ID
				const { data } = await api.get( 'customers', {
					email: customer.email,
					role: 'all',
				} );
				expect( data ).toMatchObject( [ { email: customer.email } ] );

				// Update its billing & shipping address
				const customerId = data[ 0 ].id;
				await api.put( `customers/${ customerId }`, {
					shipping: {
						first_name: 'Maggie',
						last_name: 'Simpson',
						company: '',
						address_1: '123 Evergreen Terrace',
						address_2: '',
						city: 'Springfield',
						state: 'OR',
						postcode: '97403',
						country: 'US',
					},
					billing: {
						first_name: 'Maggie',
						last_name: 'Simpson',
						company: '',
						address_1: '123 Evergreen Terrace',
						address_2: '',
						city: 'Springfield',
						state: 'OR',
						postcode: '97403',
						country: 'US',
					},
				} );
			} );
		} );

		test.afterAll( async ( { api } ) => {
			await api.delete( `products/${ productId }`, {
				force: true,
			} );
			await api.delete( `shipping/zones/${ shippingZoneId }`, {
				force: true,
			} );
			await api.put( 'payment_gateways/bacs', {
				enabled: false,
			} );
			await api.put( 'payment_gateways/cod', {
				enabled: false,
			} );
			await api.put(
				'settings/account/woocommerce_enable_checkout_login_reminder',
				{
					value: 'no',
				}
			);
			await api.put(
				'settings/account/woocommerce_enable_signup_and_login_from_checkout',
				{
					value: 'no',
				}
			);
			await api.put(
				'settings/account/woocommerce_registration_generate_password',
				{
					value: 'yes',
				}
			);
			// delete the orders we created
			if ( guestOrderId1 ) {
				await api.delete( `orders/${ guestOrderId1 }`, {
					force: true,
				} );
			}
			if ( guestOrderId2 ) {
				await api.delete( `orders/${ guestOrderId2 }`, {
					force: true,
				} );
			}
			if ( customerOrderId ) {
				await api.delete( `orders/${ customerOrderId }`, {
					force: true,
				} );
			}
			if ( newAccountOrderId ) {
				await api.delete( `orders/${ newAccountOrderId }`, {
					force: true,
				} );
			}
			// clear out the customer we create during the test
			await api.get( 'customers' ).then( async ( response ) => {
				for ( let i = 0; i < response.data.length; i++ ) {
					if (
						[
							newAccountEmail,
							newAccountEmailWithCustomPassword,
						].includes( response.data[ i ].billing.email )
					) {
						await api.delete(
							`customers/${ response.data[ i ].id }`,
							{
								force: true,
							}
						);
					}
				}
			} );
		} );

		test.beforeEach( async ( { api } ) => {
			await test.step( 'Ensure the store address is always in the US', async () => {
				await api.post( 'settings/general/batch', {
					update: [
						{
							id: 'woocommerce_store_address',
							value: 'addr 1',
						},
						{
							id: 'woocommerce_store_city',
							value: 'San Francisco',
						},
						{
							id: 'woocommerce_default_country',
							value: 'US:CA',
						},
						{
							id: 'woocommerce_store_postcode',
							value: '94107',
						},
					],
				} );
			} );
		} );

		test(
			'can see empty checkout block page',
			{ tag: [ tags.COULD_BE_LOWER_LEVEL_TEST ] },
			async ( { page, testPage } ) => {
				// go to the page to test empty cart block
				await page.goto( testPage.slug );
				await expect(
					page.getByRole( 'heading', { name: testPage.title } )
				).toBeVisible();
				await expect(
					page.locator( '.wc-block-checkout-empty', {
						hasText: 'Your cart is currently empty',
					} )
				).toBeVisible();
				await expect(
					page.getByRole( 'link', { name: 'Browse store' } )
				).toBeVisible();
				await page
					.getByRole( 'link', { name: 'Browse store' } )
					.click();
				await expect(
					page.getByRole( 'heading', { name: 'Shop' } )
				).toBeVisible();
			}
		);

		test(
			'allows customer to choose available payment methods',
			{ tag: [ tags.COULD_BE_LOWER_LEVEL_TEST ] },
			async ( { page, testPage } ) => {
				// this time we're going to add two products to the cart
				await addAProductToCart( page, productId, 2 );
				await page.goto( testPage.slug );

				await expect(
					page.getByRole( 'heading', { name: testPage.title } )
				).toBeVisible();

				// check the order summary
				await expect(
					page.locator(
						'.wc-block-components-order-summary-item__quantity'
					)
				).toContainText( '2' );
				await expect(
					page.locator(
						'.wc-block-components-order-summary-item__individual-price'
					)
				).toContainText( `$${ singleProductSalePrice }` );
				await expect(
					page.locator(
						'.wc-block-components-product-metadata__description'
					)
				).toContainText( simpleProductDesc );
				await expect(
					page.locator(
						'.wc-block-components-totals-footer-item > .wc-block-components-totals-item__value'
					)
				).toContainText( twoProductPrice );

				// check the payment methods
				await expect(
					page.getByLabel( 'Direct bank transfer' )
				).toBeVisible();
				await expect(
					page.getByLabel( 'Cash on delivery' )
				).toBeVisible();
				await page.getByLabel( 'Cash on delivery' ).check();
				await expect(
					page.getByLabel( 'Cash on delivery' )
				).toBeChecked();
			}
		);

		test(
			'allows customer to fill shipping details',
			{ tag: [ tags.COULD_BE_LOWER_LEVEL_TEST ] },
			async ( { page, testPage } ) => {
				// this time we're going to add three products to the cart
				await addAProductToCart( page, productId, 3 );
				await page.goto( testPage.slug );

				await expect(
					page.getByRole( 'heading', { name: testPage.title } )
				).toBeVisible();

				// check the order summary
				await expect(
					page.locator(
						'.wc-block-components-order-summary-item__quantity'
					)
				).toContainText( '3' );
				await expect(
					page.locator(
						'.wc-block-components-totals-footer-item > .wc-block-components-totals-item__value'
					)
				).toContainText( threeProductPrice );

				// asserting that you can fill in the shipping details
				await expect(
					page.getByLabel( 'Email address' )
				).toBeEditable();
				await expect( page.getByLabel( 'First name' ) ).toBeEditable();
				await expect( page.getByLabel( 'Last name' ) ).toBeEditable();
				await expect(
					page.getByLabel( 'Address', { exact: true } )
				).toBeEditable();
				await expect(
					page.getByText( '+ Add apartment, suite, etc.' )
				).toBeEnabled();
				await expect(
					page.getByLabel( 'Country/Region' )
				).toBeEnabled();
				await expect( page.getByLabel( 'State' ) ).toBeEnabled();
				await expect( page.getByLabel( 'City' ) ).toBeEditable();
				await expect( page.getByLabel( 'ZIP Code' ) ).toBeEnabled();
				await expect(
					page.getByLabel( 'Phone (optional)' )
				).toBeEditable();
			}
		);

		test(
			'allows customer to fill different shipping and billing details',
			{ tag: [ tags.COULD_BE_LOWER_LEVEL_TEST ] },
			async ( { page, testPage } ) => {
				await addAProductToCart( page, productId );
				await page.goto( testPage.slug );

				await expect(
					page.getByRole( 'heading', { name: testPage.title } )
				).toBeVisible();

				// to avoid flakiness, sometimes the email address is not filled
				await page
					.locator(
						'.wc-block-components-order-summary-item__individual-prices'
					)
					.waitFor( { state: 'visible' } );
				await page.getByLabel( 'Email address' ).click();
				await page.getByLabel( 'Email address' ).fill( guestEmail );
				await expect( page.getByLabel( 'Email address' ) ).toHaveValue(
					guestEmail
				);

				// fill shipping address
				await fillShippingCheckoutBlocks( page, shippingDetails );

				await page.getByLabel( 'Use same address for billing' ).click();

				// fill billing details
				await fillBillingCheckoutBlocks( page, billingDetails );

				// add note to the order
				await page.getByLabel( 'Add a note to your order' ).check();
				await page
					.getByPlaceholder(
						'Notes about your order, e.g. special notes for delivery.'
					)
					.fill( 'This is to avoid flakiness' );

				// place an order
				await page
					.getByRole( 'button', { name: 'Place order' } )
					.click();
				await expect(
					page.getByText( 'Your order has been received' )
				).toBeVisible();

				// get order ID from the page
				guestOrderId2 = getOrderIdFromUrl( page );

				await addAProductToCart( page, productId );
				await page.goto( testPage.slug );
				await expect(
					page.getByRole( 'heading', { name: testPage.title } )
				).toBeVisible();

				// verify shipping details
				await page
					.getByLabel( 'Edit shipping address', { exact: true } )
					.first()
					.click();
				await expect(
					page
						.getByRole( 'group', { name: 'Shipping address' } )
						.getByLabel( 'First name' )
				).toHaveValue( 'Homer' );
				await expect(
					page
						.getByRole( 'group', { name: 'Shipping address' } )
						.getByLabel( 'Last name' )
				).toHaveValue( 'Simpson' );
				await expect(
					page
						.getByRole( 'group', { name: 'Shipping address' } )
						.getByLabel( 'Address', { exact: true } )
				).toHaveValue( '123 Evergreen Terrace' );
				await expect(
					page
						.getByRole( 'group', { name: 'Shipping address' } )
						.getByLabel( 'City' )
				).toHaveValue( 'Springfield' );
				await expect(
					page
						.getByRole( 'group', { name: 'Shipping address' } )
						.getByLabel( 'ZIP Code' )
				).toHaveValue( '97403' );

				// verify billing details
				await page
					.getByLabel( 'Edit billing address', { exact: true } )
					.last()
					.click();
				await expect(
					page
						.getByRole( 'group', { name: 'Billing address' } )
						.getByLabel( 'First name' )
				).toHaveValue( 'Mister' );
				await expect(
					page
						.getByRole( 'group', { name: 'Billing address' } )
						.getByLabel( 'Last name' )
				).toHaveValue( 'Burns' );
				await expect(
					page
						.getByRole( 'group', { name: 'Billing address' } )
						.getByLabel( 'Address', { exact: true } )
				).toHaveValue( '156th Street' );
				await expect(
					page
						.getByRole( 'group', { name: 'Billing address' } )
						.getByLabel( 'City' )
				).toHaveValue( 'Springfield' );
				await expect(
					page
						.getByRole( 'group', { name: 'Billing address' } )
						.getByLabel( 'ZIP Code' )
				).toHaveValue( '98500' );
			}
		);

		test(
			'allows customer to fill shipping details and toggle different billing',
			{ tag: [ tags.COULD_BE_LOWER_LEVEL_TEST ] },
			async ( { page, testPage } ) => {
				await addAProductToCart( page, productId );
				await page.goto( testPage.slug );

				await expect(
					page.getByRole( 'heading', { name: testPage.title } )
				).toBeVisible();

				// to avoid flakiness, sometimes the email address is not filled
				await page
					.locator(
						'.wc-block-components-order-summary-item__individual-prices'
					)
					.waitFor( { state: 'visible' } );
				await page.getByLabel( 'Email address' ).click();
				await page.getByLabel( 'Email address' ).fill( customer.email );
				await expect( page.getByLabel( 'Email address' ) ).toHaveValue(
					customer.email
				);

				// fill shipping address and check the toggle to use a different address for billing
				await fillShippingCheckoutBlocks( page, shippingDetails );

				await expect(
					page.getByLabel( 'Use same address for billing' )
				).toBeVisible();
				await page.getByLabel( 'Use same address for billing' ).click();
				await expect(
					page
						.getByRole( 'group', { name: 'Billing address' } )
						.locator( 'h2' )
				).toBeVisible();
			}
		);

		test(
			'can choose different shipping types in the checkout',
			{ tag: [ tags.COULD_BE_LOWER_LEVEL_TEST ] },
			async ( { page, testPage } ) => {
				await addAProductToCart( page, productId );
				await page.goto( testPage.slug );

				await expect(
					page.getByRole( 'heading', { name: testPage.title } )
				).toBeVisible();

				// to avoid flakiness, sometimes the email address is not filled
				await page
					.locator(
						'.wc-block-components-order-summary-item__individual-prices'
					)
					.waitFor( { state: 'visible' } );
				await page.getByLabel( 'Email address' ).click();
				await page.getByLabel( 'Email address' ).fill( customer.email );
				await expect( page.getByLabel( 'Email address' ) ).toHaveValue(
					customer.email
				);

				// fill shipping address
				await fillShippingCheckoutBlocks( page, shippingDetails );

				await page
					.locator( '.wc-block-components-totals-shipping__via' )
					.getByText( 'Free shipping' )
					.waitFor( { state: 'visible' } );

				// check if you see all three shipping options
				await expect(
					page.getByLabel( 'Free shipping' )
				).toBeVisible();
				await expect( page.getByLabel( 'Local pickup' ) ).toBeVisible();
				await expect( page.getByLabel( 'Flat rate' ) ).toBeVisible();

				// check free shipping option
				await page.getByLabel( 'Free shipping' ).click();
				await expect(
					page.getByLabel( 'Free shipping' )
				).toBeChecked();
				await page
					.locator( '.wc-block-components-totals-shipping__via' )
					.getByText( 'Free shipping' )
					.waitFor( { state: 'visible' } );
				await expect(
					page.locator(
						'.wc-block-components-totals-footer-item > .wc-block-components-totals-item__value'
					)
				).toContainText( singleProductSalePrice );

				// check local pickup option
				await page
					.locator( '.wc-block-components-loading-mask' )
					.waitFor( { state: 'hidden' } );
				await page.getByLabel( 'Local pickup' ).click();
				await expect( page.getByLabel( 'Local pickup' ) ).toBeChecked();
				await page
					.locator( '.wc-block-components-totals-shipping__via' )
					.getByText( 'Local pickup' )
					.waitFor( { state: 'visible' } );
				await expect(
					page.locator(
						'.wc-block-components-totals-footer-item > .wc-block-components-totals-item__value'
					)
				).toContainText( singleProductSalePrice );

				// check flat rate option
				await page
					.locator( '.wc-block-components-loading-mask' )
					.waitFor( { state: 'hidden' } );
				await page.getByLabel( 'Flat rate' ).click();
				await expect( page.getByLabel( 'Flat rate' ) ).toBeChecked();
				await page
					.locator( '.wc-block-components-totals-shipping__via' )
					.getByText( 'Flat rate' )
					.waitFor( { state: 'visible' } );
				await expect(
					page.locator(
						'.wc-block-components-totals-footer-item > .wc-block-components-totals-item__value'
					)
				).toContainText( twoProductPrice );
			}
		);

		test( 'allows guest customer to place an order', async ( {
			page,
			testPage,
		} ) => {
			// adding 2 products to the cart
			await addAProductToCart( page, productId, 2 );
			await page.goto( testPage.slug );

			await expect(
				page.getByRole( 'heading', { name: testPage.title } )
			).toBeVisible();

			// to avoid flakiness, sometimes the email address is not filled
			await page
				.locator(
					'.wc-block-components-order-summary-item__individual-prices'
				)
				.waitFor( { state: 'visible' } );
			await page.getByLabel( 'Email address' ).click();
			await page.getByLabel( 'Email address' ).fill( guestEmail );
			await expect( page.getByLabel( 'Email address' ) ).toHaveValue(
				guestEmail
			);

			// fill shipping address and check cash on delivery method
			await fillShippingCheckoutBlocks( page, shippingDetails );
			await page.getByLabel( 'Cash on delivery' ).check();
			await expect( page.getByLabel( 'Cash on delivery' ) ).toBeChecked();

			// add note to the order
			await page.getByLabel( 'Add a note to your order' ).check();
			await page
				.getByPlaceholder(
					'Notes about your order, e.g. special notes for delivery.'
				)
				.fill( 'This is to avoid flakiness' );

			// place an order
			await page.getByRole( 'button', { name: 'Place order' } ).click();
			await expect(
				page.getByText( 'Your order has been received' )
			).toBeVisible();

			// get order ID from the page
			guestOrderId1 = getOrderIdFromUrl( page );

			// Let's simulate a new browser context (by dropping all cookies), and reload the page. This approximates a
			// scenario where the server can no longer identify the shopper. However, so long as we are within the 10 minute
			// grace period following initial order placement, the 'order received' page should still be rendered.
			await page.context().clearCookies();
			await page.reload();
			await expect(
				page.getByText( 'Your order has been received' )
			).toBeVisible();

			// Let's simulate a scenario where the 10 minute grace period has expired. This time, we expect the shopper to
			// be presented with a request to verify their email address.
			await setFilterValue(
				page,
				'woocommerce_order_email_verification_grace_period',
				0
			);
			await page.reload();
			await expect(
				page.getByText(
					/confirm the email address linked to the order | verify the email address associated /
				)
			).toBeVisible();

			// Supplying an email address other than the actual order billing email address will take them back to the same
			// page with an error message.
			await page
				.getByLabel( 'Email address' )
				.fill( 'incorrect@email.address' );
			await page
				.getByRole( 'button', { name: /Verify|Confirm/ } )
				.click();
			await expect(
				page.getByText(
					/confirm the email address linked to the order | verify the email address associated /
				)
			).toBeVisible();
			await expect(
				page.getByText( 'We were unable to verify the email address' )
			).toBeVisible();

			// However if they supply the *correct* billing email address, they should see the order received page again.
			// For flakiness, sometimes the email address is not filled
			await page.getByLabel( 'Email address' ).click();
			await page.getByLabel( 'Email address' ).fill( guestEmail );
			await expect( page.getByLabel( 'Email address' ) ).toHaveValue(
				guestEmail
			);
			await page
				.getByRole( 'button', { name: /Verify|Confirm/ } )
				.click();
			await expect(
				page.getByText( 'Your order has been received' )
			).toBeVisible();

			await page.goto( 'wp-login.php' );
			await logIn( page, admin.username, admin.password, false );

			// load the order placed as a guest
			await page.goto(
				`wp-admin/post.php?post=${ guestOrderId1 }&action=edit`
			);

			await expect(
				page.getByRole( 'heading', {
					name: `Order #${ guestOrderId1 } details`,
				} )
			).toBeVisible();
			await expect( page.locator( '.wc-order-item-name' ) ).toContainText(
				simpleProductName
			);
			await expect(
				page.locator( 'td.quantity >> nth=0' )
			).toContainText( '2' );
			await expect(
				page.locator( 'td.item_cost >> nth=0' )
			).toContainText( singleProductSalePrice );
			await expect(
				page.locator( 'td.line_cost >> nth=0' )
			).toContainText( twoProductPrice );
			await clearFilters( page );
		} );

		test( 'allows existing customer to place an order', async ( {
			page,
			testPage,
		} ) => {
			await addAProductToCart( page, productId, 2 );
			await page.goto( testPage.slug );

			await expect(
				page.getByRole( 'heading', { name: testPage.title } )
			).toBeVisible();

			// wait for product price to show up in the summary
			await page
				.locator(
					'.wc-block-components-order-summary-item__individual-prices'
				)
				.waitFor( { state: 'visible' } );

			// click to log in and make sure you are on the same page after logging in
			await page.locator( 'text=Log in' ).click();
			await logIn( page, customer.username, customer.password, false );
			await expect(
				page.getByRole( 'heading', { name: testPage.title } )
			).toBeVisible();

			await page
				.getByLabel( 'Edit shipping address', { exact: true } )
				.first()
				.click();

			// check COD payment method
			await page.getByLabel( 'Cash on delivery' ).check();
			await expect( page.getByLabel( 'Cash on delivery' ) ).toBeChecked();

			// add note to the order
			await page.getByLabel( 'Add a note to your order' ).check();
			await page
				.getByPlaceholder(
					'Notes about your order, e.g. special notes for delivery.'
				)
				.fill( 'This is to avoid flakiness' );

			// place an order
			await page.getByRole( 'button', { name: 'Place order' } ).click();
			await expect(
				page.getByText( 'Your order has been received' )
			).toBeVisible();

			// get order ID from the page
			customerOrderId = getOrderIdFromUrl( page );

			// Effect a log out/simulate a new browsing session by dropping all cookies.
			await page.context().clearCookies();
			await page.reload();

			// Now we are logged out, return to the confirmation page: we should be asked to log back in.
			await expect(
				page.getByText(
					/Log in here to view your order|log in to your account to view this order/
				)
			).toBeVisible();

			// Switch to admin user.
			await page.goto( 'wp-login.php?loggedout=true' );
			await logIn( page, admin.username, admin.password, false );

			// load the order placed as a customer
			await page.goto(
				`wp-admin/post.php?post=${ customerOrderId }&action=edit`
			);
			await expect(
				page.locator( 'h2.woocommerce-order-data__heading' )
			).toContainText( `Order #${ customerOrderId } details` );
			await expect( page.locator( '.wc-order-item-name' ) ).toContainText(
				simpleProductName
			);
			await expect(
				page.locator( 'td.quantity >> nth=0' )
			).toContainText( '2' );
			await expect(
				page.locator( 'td.item_cost >> nth=0' )
			).toContainText( singleProductSalePrice );
			await expect(
				page.locator( 'td.line_cost >> nth=0' )
			).toContainText( twoProductPrice );
		} );

		//todo audit follow-up: do we want both variation of the password generation? See next test
		// also covered in checkout-create-account.spec.js?
		test( 'can create an account during checkout', async ( {
			page,
			testPage,
		} ) => {
			await addAProductToCart( page, productId );
			await page.goto( testPage.slug );

			await expect(
				page.getByRole( 'heading', { name: testPage.title } )
			).toBeVisible();

			// wait for product price to show up in the summary
			await page
				.locator(
					'.wc-block-components-order-summary-item__individual-prices'
				)
				.waitFor( { state: 'visible' } );

			// check create account during checkout
			await expect(
				page.getByLabel( 'Create an account' )
			).toBeVisible();
			await page.getByLabel( 'Create an account' ).check();
			await expect(
				page.getByLabel( 'Create an account' )
			).toBeChecked();

			// For flakiness, sometimes the email address is not filled
			await page.getByLabel( 'Email address' ).click();
			await page.getByLabel( 'Email address' ).fill( newAccountEmail );
			await expect( page.getByLabel( 'Email address' ) ).toHaveValue(
				newAccountEmail
			);

			// fill shipping address and check cash on delivery method
			await fillShippingCheckoutBlocks( page, {
				firstName: 'Marge',
				...shippingDetails,
			} );
			await page.getByLabel( 'Cash on delivery' ).check();
			await expect( page.getByLabel( 'Cash on delivery' ) ).toBeChecked();

			// add note to the order
			await page.getByLabel( 'Add a note to your order' ).check();
			await page
				.getByPlaceholder(
					'Notes about your order, e.g. special notes for delivery.'
				)
				.fill( 'This is to avoid flakiness' );

			// place an order
			await page.getByRole( 'button', { name: 'Place order' } ).click();
			await expect(
				page.getByText( 'Your order has been received' )
			).toBeVisible();

			// get order ID from the page
			newAccountOrderId = getOrderIdFromUrl( page );

			// confirms that an account was created
			await page.goto( '/my-account/' );
			await expect(
				page.getByRole( 'heading', { name: 'My account' } )
			).toBeVisible();
			await page
				.getByRole( 'navigation' )
				.getByRole( 'link', { name: 'Log out' } )
				.click();

			// sign in as admin to confirm account creation
			await page.goto( 'wp-admin/users.php' );
			await logIn( page, admin.username, admin.password, false );
			await expect( page.locator( 'tbody#the-list' ) ).toContainText(
				newAccountEmail
			);
		} );

		//todo audit follow-up: do we want both variation of the password generation? See previous test
		// also covered in checkout-create-account.spec.js?
		test( 'can create an account during checkout with custom password', async ( {
			page,
			testPage,
			api,
		} ) => {
			// Password generation off
			await api.put(
				'settings/account/woocommerce_registration_generate_password',
				{
					value: 'no',
				}
			);
			await addAProductToCart( page, productId );
			await page.goto( testPage.slug );

			await expect(
				page.getByRole( 'heading', { name: testPage.title } )
			).toBeVisible();

			// wait for product price to show up in the summary
			await page
				.locator(
					'.wc-block-components-order-summary-item__individual-prices'
				)
				.waitFor( { state: 'visible' } );

			// check create account during checkout
			await expect(
				page.getByLabel( 'Create an account' )
			).toBeVisible();
			await page.getByLabel( 'Create an account' ).check();
			await expect(
				page.getByLabel( 'Create an account' )
			).toBeChecked();

			// Fill password field.
			await expect(
				page.getByLabel( 'Create a password' )
			).toBeVisible();
			await page.getByLabel( 'Create a password' ).click();
			await page
				.getByLabel( 'Create a password' )
				.fill( newAccountCustomPassword );

			// For flakiness, sometimes the email address is not filled
			await page.getByLabel( 'Email address' ).click();
			await page
				.getByLabel( 'Email address' )
				.fill( newAccountEmailWithCustomPassword );
			await expect( page.getByLabel( 'Email address' ) ).toHaveValue(
				newAccountEmailWithCustomPassword
			);

			// fill shipping address and check cash on delivery method
			await fillShippingCheckoutBlocks( page, {
				firstName: 'Marge',
				...shippingDetails,
			} );
			await page.getByLabel( 'Cash on delivery' ).check();
			await expect( page.getByLabel( 'Cash on delivery' ) ).toBeChecked();

			// add note to the order
			await page.getByLabel( 'Add a note to your order' ).check();
			await page
				.getByPlaceholder(
					'Notes about your order, e.g. special notes for delivery.'
				)
				.fill( 'This is to avoid flakiness' );

			// place an order
			await page.getByRole( 'button', { name: 'Place order' } ).click();
			await expect(
				page.getByText( 'Your order has been received' )
			).toBeVisible();

			// get order ID from the page
			newAccountOrderId = getOrderIdFromUrl( page );

			// confirms that an account was created
			await page.goto( '/my-account/' );
			await expect(
				page.getByRole( 'heading', { name: 'My account' } )
			).toBeVisible();
			await page
				.getByRole( 'navigation' )
				.getByRole( 'link', { name: 'Log out' } )
				.click();

			// Log in again.
			await page.goto( '/my-account/' );
			await logIn(
				page,
				newAccountEmailWithCustomPassword,
				newAccountCustomPassword,
				false
			);
			await expect(
				page.getByRole( 'heading', { name: 'My account' } )
			).toBeVisible();
		} );
	}
);
