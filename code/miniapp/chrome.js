export const createChrome = () => {
    const chrome = document.getElementById('chrome');
    const main = document.getElementById('MainButton');
    const secondary = document.getElementById('SecondaryButton');
    const back = document.getElementById('BackButton');
    const bind = el => ({
        setText: text => { el.textContent = text; },
        show: () => { el.hidden = false; chrome.hidden = false; },
        hide: () => {
            el.hidden = true;
            chrome.hidden = main.hidden && secondary.hidden && back.hidden;
        },
        onClick: fn => { el.onclick = fn; },
    });
    const BackButton = bind(back);
    const hideBack = BackButton.hide;
    BackButton.show = () => {
        back.hidden = false;
        main.hidden = true;
        chrome.hidden = false;
    };
    BackButton.hide = () => {
        hideBack();
        main.hidden = false;
        chrome.hidden = main.hidden && secondary.hidden && back.hidden;
    };
    return {
        MainButton: bind(main),
        SecondaryButton: bind(secondary),
        BackButton,
        HapticFeedback: { impactOccurred() {}, selectionChanged() {} },
        ready() {},
        expand() {},
        disableVerticalSwipes() {},
        setHeaderColor() {},
        setBackgroundColor() {},
    };
};
