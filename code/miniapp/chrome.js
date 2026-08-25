export const createChrome = () => {
    const chrome = document.getElementById('chrome');
    const main = document.getElementById('MainButton');
    const secondary = document.getElementById('SecondaryButton');
    const cameras = document.getElementById('CamerasButton');
    const back = document.getElementById('BackButton');
    const idle = () => main.hidden && secondary.hidden && cameras.hidden && back.hidden;
    const bind = el => ({
        setText: text => {
            el.textContent = text;
            if (el.id === 'MainButton') el.classList.toggle('ring', text === 'LIVE NEWS');
        },
        show: () => { el.hidden = false; chrome.hidden = false; },
        hide: () => {
            el.hidden = true;
            chrome.hidden = idle();
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
        chrome.hidden = idle();
    };
    return {
        MainButton: bind(main),
        SecondaryButton: bind(secondary),
        CamerasButton: bind(cameras),
        BackButton,
        HapticFeedback: { impactOccurred() {}, selectionChanged() {} },
        ready() {},
        expand() {},
        disableVerticalSwipes() {},
        setHeaderColor() {},
        setBackgroundColor() {},
    };
};
