module.exports = {
  'Test Load Page': function (browser) {
    browser
      .url('http://localhost:8189')
      .waitForElementVisible('body')
      .assert.titleContains('Dithertron')
      // make sure there's a system selector with tabbed interface
      .assert.visible('#systemTabsContainer')
      .assert.visible('.system-tab')
      // make sure one tab is active (could be any tab depending on default system)
      .assert.visible('.system-tab.active')
      // make sure there are system buttons in the active tab
      .assert.visible('.system-tab-content.active .system-tab-btn')
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
      // make sure the sidebar exists (visible on desktop)
      .assert.visible('#systemSidebar')
      .assert.visible('.system-btn')
      //
      .end();
  }
};
