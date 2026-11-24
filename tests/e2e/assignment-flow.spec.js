const { test, expect } = require('@playwright/test');

test('a passenger group is assigned to the correct taxi and the driver confirms pickup', async ({ browser }) => {
  test.setTimeout(90_000);
  const password = process.env.TAXICONNECT_TEST_PASSWORD;
  expect(password, 'TAXICONNECT_TEST_PASSWORD must be provided by the guarded dev test workflow').toBeTruthy();

  const passengerContext = await browser.newContext();
  const conductorContext = await browser.newContext();
  const driverContext = await browser.newContext();
  const passenger = await passengerContext.newPage();
  const conductor = await conductorContext.newPage();
  const driver = await driverContext.newPage();
  let waitId = null;
  let waitingCard = null;
  let signalDialogMessage = null;

  try {
    // Passenger creates a seven-person Sun City group using anonymous Firebase Auth.
    await passenger.goto('/passenger.html');
    await passenger.waitForFunction(() => firebase.auth().currentUser !== null);
    await passenger.getByRole('button', { name: /Find a Taxi/ }).click();
    for (let i = 0; i < 6; i += 1) {
      await passenger.locator('.counter-wrap .cbtn.plus').click();
    }
    await expect(passenger.locator('#groupVal')).toHaveText('7');
    const signalDialog = passenger.waitForEvent('dialog').then(async dialog => {
      signalDialogMessage = dialog.message();
      await dialog.accept();
      return signalDialogMessage;
    });
    await passenger.getByRole('button', { name: /Alert Conductor/ }).click();
    expect(await signalDialog).toBe('Waiting signal sent successfully.');
    await expect(passenger.locator('#waitStatus')).toContainText('waiting signal is active');
    waitId = await passenger.evaluate(() => myWaitId);
    expect(waitId).toBeTruthy();
    const groupCode = waitId.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase();

    // Operator assigns that exact waiting request to the seeded Sun City taxi.
    await conductor.goto('/conductor.html');
    await conductor.getByLabel('Email address').fill('conductor@taxiconnect.test');
    await conductor.getByLabel('Password').fill(password);
    await conductor.getByRole('button', { name: 'Enter Dashboard' }).click();
    await expect(conductor.locator('#appScreen')).toHaveClass(/active/);
    await conductor.locator('.tab').filter({ hasText: 'Waiting' }).click();
    waitingCard = conductor.locator('#waitingList [data-wait-id="' + waitId + '"]');
    await expect(waitingCard).toBeVisible();
    await waitingCard.locator('select').selectOption({ index: 0 });
    await waitingCard.getByRole('button', { name: 'Assign' }).click();

    await expect(passenger.locator('#waitStatus')).toContainText('Group #' + groupCode);
    await expect(passenger.locator('#waitStatus')).toContainText('7 passenger(s) assigned');

    // The assigned driver sees the same group code and confirms that this group boarded.
    await driver.goto('/driver.html');
    await driver.getByLabel('Email address').fill('driver1@taxiconnect.test');
    await driver.getByLabel('Password').fill(password);
    await driver.getByRole('button', { name: 'Enter App' }).click();
    await expect(driver.locator('#liveCard')).toBeVisible();
    const assignedGroup = driver.locator('#assignedGroupsList [data-wait-id="' + waitId + '"]');
    await expect(assignedGroup).toContainText('Group #' + groupCode);
    await expect(assignedGroup).toContainText('7 passenger(s)');
    await assignedGroup.getByRole('button', { name: 'Confirm pickup' }).click();

    await expect(assignedGroup).toContainText('PICKED UP');
    await expect(driver.locator('#liveVal')).toHaveText('10');
    await expect(passenger.locator('#waitStatus')).toContainText('confirmed pickup');
    await expect(waitingCard).toContainText('Driver confirmed pickup');

    // Operator marks the taxi departed; the passenger queue and driver live screen must close.
    await conductor.locator('.tab').filter({ hasText: 'Taxis' }).click();
    const taxiCard = conductor.locator('#taxiList .taxi-row').filter({ hasText: 'Test Driver 1' }).last();
    await expect(taxiCard).toContainText('10/14 onboard');
    await taxiCard.getByRole('button', { name: /Depart/ }).click();
    await expect(waitingCard).toHaveCount(0);
    await expect(passenger.locator('#waitStatus')).toBeHidden();
    await expect(driver.locator('#liveCard')).toBeHidden();
    await expect(driver.locator('#checkInCard')).toBeVisible();
  } finally {
    await passengerContext.close();
    await conductorContext.close();
    await driverContext.close();
  }
});
