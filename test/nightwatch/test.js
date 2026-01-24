module.exports = {
  'Test Load Page': function (browser) {
    browser
      .url('http://localhost:8189')
      .waitForElementVisible('body')
      .assert.titleContains('Dithertron')
      // make sure there's a PNG download button
      .assert.visible('button[id="downloadImageBtn"]')
      .assert.textContains('button[id="downloadImageBtn"]', 'PNG')
      // make sure there's a Copy button
      .assert.visible('button[id="copyImageBtn"]')
      .assert.textContains('button[id="copyImageBtn"]', 'Copy')
      // make sure the example dropdown exists
      .assert.textContains('a[id="dropdownMenuLink"]', 'Select an example')
      // make sure the image upload input exists
      .assert.visible('input[id="imageUpload"]')
      // make sure the sidebar exists with tabs
      .assert.visible('#systemSidebar')
      .assert.visible('.sidebar-tab')
      .assert.visible('.sidebar-tab.active')
      .assert.visible('.system-btn')
      // make sure current system display exists
      .assert.elementPresent('#currentSystemDisplay')
      //
      .end();
  }
};
