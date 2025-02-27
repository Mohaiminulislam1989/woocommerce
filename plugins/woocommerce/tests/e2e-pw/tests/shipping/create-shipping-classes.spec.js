const { test, expect } = require( '@playwright/test' );
const { tags } = require( '../../fixtures/fixtures' );
const { ADMIN_STATE_PATH } = require( '../../playwright.config' );

test.describe(
	'Merchant can add shipping classes',
	{ tag: [ tags.SERVICES ] },
	() => {
		test.use( { storageState: ADMIN_STATE_PATH } );

		test.afterEach( async ( { page } ) => {
			// no api endpoints for shipping classes, so use the UI to cleanup
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping&section=classes'
			);

			await page
				.locator( '.wc-shipping-class-delete >> nth=0' )
				.dispatchEvent( 'click' );
		} );

		test( 'can add shipping classes', async ( { page } ) => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping&section=classes'
			);

			const shippingClassSlug = {
				name: 'Small Items',
				slug: 'small-items',
				description: "Small items that don't cost much to ship.",
			};
			const shippingClassNoSlug = {
				name: 'Poster Pack',
				slug: '',
				description: 'Posters, stickers, and other flat items.',
			};
			const shippingClasses = [ shippingClassSlug, shippingClassNoSlug ];

			// Add shipping classes
			for ( const { name, slug, description } of shippingClasses ) {
				await page
					.getByRole( 'link', { name: 'Add shipping class' } )
					.click();
				await page
					.getByPlaceholder( 'e.g. Heavy', { exact: true } )
					.fill( name );
				await page
					.getByPlaceholder( 'e.g. heavy-packages', { exact: true } )
					.fill( slug );
				await page
					.getByPlaceholder(
						'e.g. For heavy items requiring higher postage',
						{ exact: true }
					)
					.fill( description );

				await page.getByRole( 'button', { name: 'Create' } ).click();
			}

			// Set the expected auto-generated slug
			shippingClassNoSlug.slug = 'poster-pack';

			// Verify that the specified shipping classes were saved
			for ( const { name, slug, description } of shippingClasses ) {
				await expect(
					page.getByText( name, { exact: true } )
				).toBeVisible();
				await expect( page.locator( `text=${ slug }` ) ).toBeVisible();
				await expect(
					page.getByText( description, { exact: true } )
				).toBeVisible();
			}
		} );
	}
);
